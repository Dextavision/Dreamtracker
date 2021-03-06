import { Dream } from "../models/dream.model";
import { Injectable } from "@angular/core";
import { GoalsService } from "./goal.service";
import { APIService } from "src/app/API.service";
import { UserService } from "./user.service";

@Injectable({
  providedIn: "root"
})
export class DreamsService {
  private dreams: Dream[] = [];
  private publicDreams: Dream[] = [];

  constructor(
    private goalService: GoalsService,
    private apiService: APIService,
    private userService: UserService
  ) {}

  // Fetch dreams from the database when user logged in
  async fetchDreams(user: any) {
    const dreams = await this.apiService.ListDreams(user.attributes.email);

    dreams.forEach(async dream => {
      await this.goalService.fetchGoals(dream.dreamID);
      this.dreams.push({
        ID: dream.dreamID,
        name: dream.name,
        description: dream.description,
        goals: this.goalService.getGoals(dream.dreamID),
        isPrivate: dream.private === 1 ? true : false,
        upvote: dream.upvotes,
        progress: 0,
        status: "To Do",
        user: dream.userID,
        createdAt: dream.created
      });
      this.updateProgressBar(dream.dreamID);
      this.sortDreams();
    });
  }

  getUserDreams() {
    return this.dreams;
  }

  async fetchPublicDreams() {
    const publicDreams = await this.apiService.ListPublicDreams();

    publicDreams.forEach(async dream => {
      this.publicDreams.push({
        ID: dream.dreamID,
        name: dream.name,
        description: dream.description,
        goals: [],
        isPrivate: false,
        upvote: dream.upvotes,
        progress: 0,
        status: "",
        user: dream.userID,
        createdAt: dream.created
      });
    });
  }

  getPublicDreams() {
    return this.publicDreams;
  }

  // Get Public Dream from a User
  getPublicUserDream(user: string) {
    return this.publicDreams.filter(dream => dream.user === user);
  }

  // Updates Upvotes from Dream
  likeDream(dreamID: number, liked: boolean) {
    const dreamIndex = this.publicDreams.findIndex(
      element => element.ID === dreamID
    );

    liked
      ? this.publicDreams[dreamIndex].upvote++
      : this.publicDreams[dreamIndex].upvote--;

    this.apiService.UpdateDream({
      dreamID: this.publicDreams[dreamIndex].ID,
      upvotes: this.publicDreams[dreamIndex].upvote
    });
  }

  async saveNewDream(
    dreamName: string,
    dreamDescr: string,
    dreamPrivate: boolean
  ) {
    let privateNumber = dreamPrivate ? 1 : 0;

    const newDream = await this.apiService.CreateDream({
      name: dreamName,
      description: dreamDescr,
      private: privateNumber,
      userID: this.userService.user.attributes.email,
      upvotes: 0,
      created: this.userService.getCurrentDate()
    });

    this.dreams.push({
      ID: newDream.dreamID,
      name: newDream.name,
      description: newDream.description,
      goals: [],
      isPrivate: dreamPrivate,
      upvote: 0,
      progress: 0,
      status: "To Do",
      user: newDream.userID,
      createdAt: newDream.created
    });

    if (!dreamPrivate) {
      this.publicDreams.push({
        ID: newDream.dreamID,
        name: newDream.name,
        description: newDream.description,
        goals: [],
        isPrivate: dreamPrivate,
        upvote: 0,
        progress: 0,
        status: "To Do",
        user: newDream.userID,
        createdAt: newDream.created
      });
    }
  }

  checkDreamCount() {
    // TODO Check if Dream is active or done
    return true;
    if (this.dreams.length === 5) {
      return false;
    }
    return true;
  }

  deleteDream(dreamID: number) {
    const selectedDreamIndex = this.dreams.findIndex(
      dream => dream.ID === dreamID
    );
    // Delete all goals related to this dream
    if (this.dreams[selectedDreamIndex].goals.length > 0) {
      this.goalService.deleteGoals(this.dreams[selectedDreamIndex].goals);
    }

    // Delete the Upvotes for this dream
    this.apiService.DeleteUpvote(dreamID);

    // Delete the dream
    this.apiService.DeleteDream(this.dreams[selectedDreamIndex].ID).then(() => {
      this.dreams.splice(selectedDreamIndex, 1);
    });

    // Delete public dream aswell
    if (!this.dreams[selectedDreamIndex].isPrivate) {
      const publicIndex = this.findPublicDream(
        this.dreams[selectedDreamIndex].ID
      );
      this.publicDreams.splice(publicIndex, 1);
    }
  }

  saveEditedDream(editedDream: Dream) {
    let privateNumber = editedDream.isPrivate ? 1 : 0;

    this.apiService.UpdateDream({
      dreamID: editedDream.ID,
      name: editedDream.name,
      description: editedDream.description,
      private: privateNumber,
      upvotes: editedDream.upvote
    });

    // Refresh private status of the dream
    if (editedDream.isPrivate) {
      const index = this.publicDreams.findIndex(
        element => element.ID === editedDream.ID
      );
      this.publicDreams.splice(index, 1);
    } else {
      const publicIndex = this.findPublicDream(editedDream.ID);
      publicIndex < 0
        ? this.publicDreams.push(editedDream)
        : (this.publicDreams[publicIndex] = editedDream);
    }
  }

  addGoalToADream(dreamID: number, goalID: number) {
    const dreamIndex = this.dreams.findIndex(dream => dream.ID === dreamID);
    this.dreams[dreamIndex].goals.push(this.goalService.getGoalByID(goalID));
  }

  deleteGoalFromDream(dreamID: number, goalID: number) {
    const dreamIndex = this.dreams.findIndex(dream => dream.ID === dreamID);
    if (dreamIndex !== -1) {
      this.dreams[dreamIndex].goals.splice(
        this.dreams[dreamIndex].goals.findIndex(goal => goal.id === goalID),
        1
      );
    }
  }

  updateProgressBar(dreamID: number) {
    const allGoals = this.goalService.getGoals(dreamID);

    // If the dream doesnt have goals there is no need to update the progress bar
    if (allGoals.length === 0) {
      return;
    }

    const goalQuantity = allGoals.length;
    const finishedGoals = allGoals.filter(element => element.finished === true)
      .length;
    const dreamIndex = this.dreams.findIndex(element => element.ID === dreamID);

    const dreamDone = (this.dreams[dreamIndex].progress = Math.round(
      (100 / goalQuantity) * finishedGoals
    ));
    // Set Dream Status Based on the current progress
    if (dreamDone === 0) {
      this.dreams[dreamIndex].status = "To Do";
    } else if (dreamDone <= 20) {
      this.dreams[dreamIndex].status = "In Progress";
    } else if (dreamDone <= 60) {
      this.dreams[dreamIndex].status = "Keep it up!";
    } else if (dreamDone <= 90) {
      this.dreams[dreamIndex].status = "Almost Done, keep going!";
    } else if (dreamDone === 100) {
      this.dreams[dreamIndex].status = "Done";
    }
  }

  // Sort Dreams to show user the dreams with the most progress at the top
  sortDreams() {
    this.dreams.sort((a, b) => {
      return b.progress - a.progress;
    });
  }

  // Find public dream to make changes equal to the original dream (editing/deleting)
  findPublicDream(id: number): number {
    return this.publicDreams.findIndex(element => element.ID === id);
  }
}
