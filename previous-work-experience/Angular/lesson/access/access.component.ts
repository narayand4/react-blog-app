import { Component, OnInit, ViewChild, HostListener, NgZone } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { CookieService } from 'ng2-cookies';

import { AuthService } from '../../common/auth.service';
import { ProfileService } from '../../profile/profile.service';
import { CommonService } from '../../common/common.service';
import { SocketService } from '../../common/socket.service';
import { NotifyService } from '../../common/notify.service';
import { LessonService } from '../lesson.service';
import { TranslatePipe } from 'ng2-translate';

import { SafeHtmlPipe } from '../../pipes/safe';

import _ from 'lodash';
declare var jQuery:any;


@Component({
	selector: 'app-access',
	templateUrl: './access.component.html',
	styleUrls: ['./access.component.css'],
	providers: [LessonService, TranslatePipe, SafeHtmlPipe, ProfileService, CookieService]
})
export class AccessComponent implements OnInit {
	private user:any;
	private subParam:any;
	private tnId:any;
	private talentnook:any;
	public currentStatus:any;
	public countDown: number = 0;

  	constructor(
  		public profileService: ProfileService,
		public authService: AuthService,
		public commonService: CommonService,
		protected lessonService: LessonService,
		public route: ActivatedRoute,
		public router: Router,
		public translate: TranslatePipe,
  	) { 

  	}

  	ngOnInit() {
  		this.user = this.authService.loadUser();
  		this.subParam = this.route.params.subscribe(params => {
	        this.tnId = params['objectId'];
	        if (this.tnId) {
	          	this.loadTn();
	        } else {
	        	console.log('subParam',this.tnId);
	          	this.router.navigate(['/']);
	        }
	    });
  	}

  	loadTn(){
		this.commonService.notifyFlashMsgChanges({isLoading:1})
		// let data = {tnId:this.tnId, userId: this.user._id};
		this.lessonService.getDetail(this.tnId).subscribe(jsonData => {
			if(jsonData.error==1){
				this.router.navigate(['/404']);
			}else{
				this.talentnook = jsonData.lesson;
				// this.msgCountData = jsonData.msgData;			

				if(this.talentnook && this.talentnook.status){				
					if(this.commonService.isParticipantOfTN(this.talentnook, this.user)){
						this.currentStatus = this.commonService.validateTNUserAccessStatus(this.talentnook, this.user);
						if(!this.currentStatus){
							this.router.navigate(['/unauthorized']);
						}
						if(this.currentStatus=='WAITLISTED' || this.currentStatus=='REQUESTED'){
							let self = this;
							setTimeout(function(){
								self.autoRedirect();
							},1000);
						}
					}else{
						this.router.navigate(['/unauthorized']);
					}
				}
				this.commonService.notifyFlashMsgChanges({isLoading:0});
			}
		},err =>{
			this.commonService.notifyFlashMsgChanges({isLoading:0});
		});
	}

	getMessage(type:any='requested'){
		let msg = "";
		if(this.talentnook && this.talentnook.tmId && this.talentnook.tmId.fname && this.talentnook.name){
			switch (type) {
				case "requested_1":
					msg = this.translate.transform('access_denied_requested_msg_1');
					msg = msg.toString();
					msg = _.replace(msg,"{{Talentmaster}}",this.talentnook.tmId.fname);
					break;
				case "requested_2":
					msg = this.translate.transform('access_denied_requested_msg_2');
					msg = msg.toString();
					msg = _.replace(msg,"{{Talentmaster}}",this.talentnook.tmId.fname);
					break;
				case "invited":
					msg = this.translate.transform('access_denied_invited');
					msg = msg.toString();
					msg = _.replace(msg,"{{TalentnookName}}",this.talentnook.name);
					break;
			}
		}
		return msg;
	}
	autoRedirect(){
		if(this.countDown==10){
			this.router.navigate(['/mylessons']);
		}
		this.countDown++;
		let self = this;
		setTimeout(function(){
			self.autoRedirect();
		},1000);
	}
}
