import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { TranslatePipe } from 'ng2-translate';
import { CookieService } from 'ng2-cookies';
import { environment } from '../../../environments/environment';

import { AuthService } from '../../common/auth.service';
import { CommonService } from '../../common/common.service';
import { NotifyService } from '../../common/notify.service';
import { ProfileService } from '../../profile/profile.service';
// import { TimeAgoPipe } from '../../pipes/time-ago';
// import { UserService } from '../../user/user.service';
// import { CmsService } from '../../cms/cms.service';

import { phoneValidator, numberValidator, emailValidator, rangeValidator, zipValidator } from '../../validators/custom-validation';

declare var jQuery:any;
import _ from 'lodash';

@Component({
	selector: 'app-createlesson',
	templateUrl: './createlesson.component.html',
	styleUrls: ['./createlesson.component.css'],
	providers: [ProfileService, TranslatePipe]
})
export class CreatelessonComponent implements OnInit {
	@ViewChild('talentdetails') talentdetails;

	public breadcrumbData: any = [{linkurl:'/mylessons',label:'My lessons'}, {linkurl:'',label:'Create new lesson'}];
	public user: any = {};
	public sub : any;
	public currentUrl: string = '';
	public currentActiveTab: string = '';
	public isGrandfathering: boolean = false;

	constructor(
		public authService: AuthService,
	    public commonService: CommonService,
	    // public userService: UserService,
	    public notifyService: NotifyService,
	    public profileService: ProfileService,
	    public router: Router,
	    private activatedRoute: ActivatedRoute,
	  	public cookieService: CookieService,
	    private translate: TranslatePipe,
	    // private timeAgoPipe: TimeAgoPipe,
	) { }

	ngOnInit() {
		// this.user = this.authService.loadUser();

		this.sub = this.activatedRoute.params.subscribe(params => {
			this.currentUrl = this.router.url;
            if(this.router.url.toLowerCase().indexOf("create")!=-1 || this.router.url.toLowerCase().indexOf("creategflesson")!=-1){
                this.updateGrandfathering();
            }
            if(params['type'] && !_.isEmpty(params['type'])){
                this.currentActiveTab = params['name'];
            }
        });

		this.loadUserProfile();
	}

	ngOnDestroy() {
      	if(this.sub){
          	this.sub.unsubscribe();
      	}
    }

    updateGrandfathering(){
        if(this.currentUrl.toLowerCase().indexOf("creategflesson")!=-1){
            this.isGrandfathering = true;
        }
    }

	loadUserProfile(){
		this.commonService.notifyFlashMsgChanges({isLoading:1});
	    this.profileService.getProfile().subscribe( jsonData => {
	      	if(jsonData.error==0 && jsonData.user){
				this.user = jsonData.user;
	      	}
	      	this.commonService.notifyFlashMsgChanges({isLoading:0});
	    }, err => {
	      	this.commonService.notifyFlashMsgChanges({isLoading:0});
			// console.log("loadProfileByUsername",err);
			this.router.navigate(['/']);
	    });
	}

	nextPreviousAction(event){

	}

}
