import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { DataTableModule, SharedModule, LazyLoadEvent, SelectItem, Dropdown } from 'primeng/primeng';
import { AuthService } from '../common/auth.service';
import { ProfileService } from '../profile/profile.service';
import { CommonService } from '../common/common.service';
import { LessonService } from './lesson.service';
import { SocketService } from '../common/socket.service';
import { TranslatePipe } from 'ng2-translate';

import { SafeHtmlPipe } from '../pipes/safe';

import _ from 'lodash';

@Component({
  selector: 'app-lesson',
  templateUrl: './lesson.component.html',
  providers: [LessonService,ProfileService,TranslatePipe,SafeHtmlPipe]
})
export class LessonComponent implements OnInit {
	public selectionType = "mynooks";
	public parentRoute = false;
	public rightpanelViewmode = "";
	public leftpanelViewmode = "";
	public errorMessage: any;
	public errorMessageLink: any;
	public lessons: any;
	public talentnookPayments: any;
	public unseenCountData: any;
	public gridData: any = {
	    'draft': [],
	    'new': [],
	    'inactive': [],
	    'ongoing': [],
	};
	allfilters: any;
	public user: any;
	public showInactive: boolean = false;
	public search: any = {filters : []};
	public hasTalentnooks: boolean = false;
	public dataLoaded: boolean = false;
	public published = false;
	public dashboardTitle : string; 

	public sub : any;
	public msgBoardSubscription : any;

	constructor(
		public authService: AuthService, 
		public profileService: ProfileService, 
		public commonService: CommonService,
		protected lessonService: LessonService,
		private translate: TranslatePipe,
		private safeHtml: SafeHtmlPipe,
		public route: ActivatedRoute,
		public router: Router,
		private socket: SocketService,
	) { 
		console.log('this.router.url',this.router.url.includes("parentview"));
		if(this.router.url.includes("parentview")){
			this.parentRoute = true;
			this.selectionType = 'parentview';
		}else{
			this.parentRoute = false;
		}
	}

	ngOnInit() {
		this.dashboardTitle = this.translate.transform('my_lessons');

	    this.sub = this.router.events.subscribe((event:any) => { 
	    	if (event instanceof NavigationEnd){
	    		console.log('event.url',event.url.includes("parentview"));
	    		if(event.url.includes("parentview")){
	    			this.parentRoute = true;
	    			this.selectionType = 'parentview';
	    		}else{
	    			this.parentRoute = false;
	    		}
	    	}
	    });

	    // To handle the new message update for Talentnooks
	    this.msgBoardSubscription = this.socket.notifyMsgBoardNewMessageObservable$.subscribe((res) => {
			console.log('notifyMsgBoardNewMessageObservable$ ', res);
			if(res.hasOwnProperty('action') && res.data){
				if (res.action == "updateNewMessageOnMyTalentnook" && res.data) {
					this.updateUnseenCountInTN(res.data);
				}
			}
	    });

		this.commonService.notifyFlashMsgChanges({isLoading:1});
		this.profileService.getProfile().subscribe(data => {
			this.user = data.user;
			if(this.parentRoute && this.authService.isParent(this.user)){
				this.rightpanelViewmode = 'PARENT';
				this.leftpanelViewmode = 'PARENT';
				if(this.authService.isParent(this.user) && this.authService.isTM(this.user) && this.user.totalEnrolledTn && this.user.totalEnrolledTn>0){
					this.leftpanelViewmode = 'BOTH';
				}
			}else if(this.authService.isTM(this.user)){
				this.rightpanelViewmode = 'TM';
				this.leftpanelViewmode = 'TM';
				if(this.authService.isParent(this.user) && this.user.totalEnrolledTn && this.user.totalEnrolledTn>0){
					this.leftpanelViewmode = 'BOTH';
				}
			}else{
				this.rightpanelViewmode = 'PARENT';
				this.leftpanelViewmode = 'PARENT';
			}
			// console.log(this.rightpanelViewmode,this.leftpanelViewmode,this.parentRoute);
			this.getErrorMessage();
			this.loadLazy();
		},err =>{
			this.commonService.notifyFlashMsgChanges({isLoading:0})
		});		
	}
	ngOnDestroy() {
	    if(this.sub){
	      this.sub.unsubscribe();
	    }
	    if(this.msgBoardSubscription){
	      this.msgBoardSubscription.unsubscribe();
	    }
	}

  	loadLazy() {
  		if(this.rightpanelViewmode=="TM"){
			this.allfilters = {tmId: this.user._id, sortOrder: '-1', sortField: 'createdOn'};
  		}else if(this.rightpanelViewmode=="PARENT"){
			this.allfilters = {parentId: this.user._id, sortOrder: '-1', sortField: 'createdOn'};
  		}	


		// TO LOAD ALL UNSEEN MESSAGE OF THIS PARTICULAR USER'S TALENTNOOK
		let userData = {userId: this.user._id};
		this.lessonService.getUnseenMsgCount(userData).subscribe(jsonDataCount => {
			// console.log(jsonDataCount.data);
			if(jsonDataCount.error==0){
				// console.log(jsonData.data);
				this.unseenCountData = jsonDataCount.msgData;

				// LOAD TALENTNOOK LIST SO THAT WE CAN UPDATE THE COUND OF EACH TN.
				this.lessonService.getList(this.allfilters).subscribe(jsonData => {
					this.lessons = jsonData.data;
					this.talentnookPayments = jsonData.pmSummary;
					// To update grid data as well as unseencount
					this.updateGridData(true);
					
				  	this.commonService.notifyFlashMsgChanges({isLoading:0})
					this.dataLoaded = true;
				}, error => {
				  this.gridData = [];
				  this.commonService.notifyFlashMsgChanges({isLoading:0})
				  this.dataLoaded = true;
				});

			}else{
		  		this.commonService.notifyFlashMsgChanges({isLoading:0});
			}
		}, error => {
		  this.unseenCountData = [];
		  this.commonService.notifyFlashMsgChanges({isLoading:0});
		});
  	}

  	getErrorMessage(){
  		if(this.rightpanelViewmode=='TM'){
	  		if(this.authService.isTM(this.user)){
	  			if(this.user && this.user.tm && this.user.tm.isPublished){
		  			this.published = true;
		  			this.errorMessage = this.safeHtml.transform(this.translate.transform('lbl_mylesson_not_found'));
		  			this.errorMessageLink = "";
		  		}else{
		  			this.published = false;
		  			this.errorMessage = this.safeHtml.transform(this.translate.transform('lbl_mytalentnook_not_published'));
		  			this.errorMessageLink = "";
		  		}
	  		}else{
		  		this.errorMessage = this.safeHtml.transform(this.translate.transform('lbl_parent_mylesson_not_found'));
		  		this.errorMessageLink = this.safeHtml.transform(this.translate.transform('search_lessons_near_you'));
	  		}
	  	}else{
	  		this.published = false;
		  	this.errorMessage = this.safeHtml.transform(this.translate.transform('lbl_parent_mylesson_not_found'));
		  	this.errorMessageLink = this.safeHtml.transform(this.translate.transform('search_lessons_near_you'));
	  	}
  	}

  	updateGridData(updateSeenUnseen:boolean=false){
  		let gridDataTemp = _.clone(this.gridData);
  		for(var i=0; i<this.lessons.length; i++){
  			if(updateSeenUnseen){
				let msgCount = this.getUnseenCount(this.lessons[i]);
				this.lessons[i].totalUnseenMsg = msgCount;
				// console.log(this.lessons[i]._id, msgCount);
  			}

			if(this.lessons[i].status=="DRAFT" || this.lessons[i].status=="NOTLAUNCHED"){
			  gridDataTemp['draft'].push(this.lessons[i]);
			  this.hasTalentnooks = true;
			}
			if(this.lessons[i].status=="REQUESTED" || this.lessons[i].status=="ACKNOWLEDGED"){
			  gridDataTemp['new'].push(this.lessons[i]);
			  this.hasTalentnooks = true;
			}
			if(this.lessons[i].status=="ACTIVE"){
			  gridDataTemp['ongoing'].push(this.lessons[i]);
			  this.hasTalentnooks = true;
			}
			if(this.lessons[i].status=="CANCELED" || this.lessons[i].status=="SUSPENDED"  || this.lessons[i].status=="DECLINED" || this.lessons[i].status=="INACTIVE" || this.lessons[i].status=="CLOSED"){
				// console.log(this.lessons[i].status);
			  	gridDataTemp['inactive'].push(this.lessons[i]);
			  	this.hasTalentnooks = true;
			}
		}
		// Update once instead of in loop it will trigger multiple change listner.
		this.gridData = gridDataTemp;
  	}

  	getUnseenCount(tnObject){
  		let count = 0;
  		if(tnObject && tnObject._id && this.unseenCountData && this.unseenCountData.length>0){
  			for (var i = this.unseenCountData.length - 1; i >= 0; i--) {
  				if(this.unseenCountData[i]._id==tnObject._id){
  					count = this.unseenCountData[i].unseenMsg;
  					break;
  				}
  			}
  		}
  		return count;
  	}
  	updateUnseenCountInTN(msgData){
  		if(msgData && msgData.tnId && msgData.tnId!=""){
  			let tnsTemp = _.clone(this.lessons);
  			for (var i = tnsTemp.length - 1; i >= 0; i--) {
  				if(tnsTemp[i]._id==msgData.tnId){
  					tnsTemp[i].totalUnseenMsg = tnsTemp[i].totalUnseenMsg+1;
  				}
  			}
  			// Update once instead of in loop it will trigger multiple change listner.
  			this.lessons = tnsTemp;
  			// To update grid data as well as unseencount
			this.updateGridData(false);
  		}
  	}
}
