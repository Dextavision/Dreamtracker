import {
  Component,
  Inject,
  Renderer,
  ElementRef,
  ViewChild
} from "@angular/core";
import { Router, NavigationEnd } from "@angular/router";
import { Subscription } from "rxjs/Subscription";
import "rxjs/add/operator/filter";
import { Location, DOCUMENT } from "@angular/common";
import { NavbarComponent } from "./navbar/navbar.component";
import { UserService } from "./shared/services/user.service";
import { DreamsService } from "./shared/services/dream.service";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent {
  title = "Dreamtracker";

  private _router: Subscription;
  @ViewChild(NavbarComponent, { static: true }) navbar: NavbarComponent;

  constructor(
    private renderer: Renderer,
    private router: Router,
    @Inject(DOCUMENT) private document: any,
    private element: ElementRef,
    public location: Location,
    private userService: UserService,
    private dreamService: DreamsService
  ) {}
  async ngOnInit() {
    // Create current User in DB if not exist yet
    setTimeout(async () => {
      await this.userService.getCurrentUser();
      const user = this.userService.user;

      // Fetch all informations from current user to display the data
      if (user) {
        this.userService.insertNewUser();
        this.dreamService.fetchDreams(user);
        this.dreamService.fetchPublicDreams();
        this.userService.fetchUserSetting();
      }
    }, 1000);

    var navbar: HTMLElement = this.element.nativeElement.children[0]
      .children[0];
    this._router = this.router.events
      .filter(event => event instanceof NavigationEnd)
      .subscribe((event: NavigationEnd) => {
        if (window.outerWidth > 991) {
          window.document.children[0].scrollTop = 0;
        } else {
          window.document.activeElement.scrollTop = 0;
        }
        this.navbar.sidebarClose();
      });
    this.renderer.listenGlobal("window", "scroll", event => {
      const number = window.scrollY;
      if (number > 150 || window.pageYOffset > 150) {
        // add logic
        navbar.classList.remove("navbar-transparent");
      } else {
        // remove logic
        navbar.classList.add("navbar-transparent");
      }
    });
    var ua = window.navigator.userAgent;
    var trident = ua.indexOf("Trident/");
    if (trident > 0) {
      // IE 11 => return version number
      var rv = ua.indexOf("rv:");
      var version = parseInt(ua.substring(rv + 3, ua.indexOf(".", rv)), 10);
    }
    if (version) {
      var body = document.getElementsByTagName("body")[0];
      body.classList.add("ie-background");
    }
  }
  removeFooter() {
    var titlee = this.location.prepareExternalUrl(this.location.path());
    titlee = titlee.slice(1);
    if (titlee === "signup" || titlee === "nucleoicons") {
      return false;
    } else {
      return true;
    }
  }
}
