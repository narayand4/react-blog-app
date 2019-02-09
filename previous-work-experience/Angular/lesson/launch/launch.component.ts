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
  selector: 'app-launch',
  templateUrl: './launch.component.html',
  styleUrls: ['./launch.component.css'],
  providers: [LessonService, TranslatePipe, SafeHtmlPipe, ProfileService, CookieService]
})
export class LaunchComponent implements OnInit {
	@ViewChild('tnheader') tnheader;
	@ViewChild('lessonDetailCom') lessondetailCom;
	@ViewChild('lessonCom') lessonCom;
	@ViewChild('hostDetailCom') hostdetailCom;
	@ViewChild('lessonOutlineCom') lessonOutlineCom;
	@ViewChild('requestlistCom') requestlistCom;
	@ViewChild('feesCom') feesCom;
	@ViewChild('policyCom') policyCom;
	@ViewChild('messageBoardCom') messageBoardCom;

	public isJoinRequest = true; // true = to hide requst title and show tn name
	public showMyTnLink = true; // true to show my talentnook button in header.

	public launchOperation = false; // false = launch, true = operations
	public initialMessageUpdate = false; // false = if initially user check message then need to update initially only
	public parentComponent = 'launch'; // 'operations'
	public userViewMode = ''; // PARENT, TM
	public dataLoaded = false;
	
	public user: any = {}; // Default logged in user.
	public tmuser: any = {}; // talentmaster user data.
	public hostuser: any = {}; // host user data
	public userContainer: any = {tmuser: this.tmuser, hostuser: this.hostuser, user: this.user};
	public talentnook: any = {}; // host user data
	public msgCountData: any = {}; // msgData which will contain total and unseen msg counts
	public msgData: any = {unseenMsg: 0}; // msgData which will contain total and unseen msg counts
	// public parentuser: any = {}; // Default logged in user.

	private subUrl: any;
	private subParam: any;
	private invitationSubscription: any;
	private unseenSubscription: any;
	private tnId: any;
	private requestId: any;
	public header_msg: string = "";
	public launch_tnlaunch_info: string = "";

	// Child component related variables
	public gridViewMode: string = "user";  // tm if talentmaster looking himself
	public isEditable: boolean = false;
	public isParentEditable: boolean = false;
	public isSingleForm: boolean = false;
	public lessonEdit: boolean = false;
	public lessonDetailEdit: boolean = false;
	public hostDetailEdit: boolean = false;
	public requestListEdit: boolean = false;
	public lessonOutlineEdit: boolean = false;
	public feesEdit: boolean = false;
	public policyEdit: boolean = false;

	public infoBoxTitle: string = ""; // schedule_updated
	public infoBoxDescription: string = ""; // alert_schedule_updated
	public buggyComponent: any = [];
	// private lockEditingStatus = ['CLOSED','DECLINED','CANCELLED','SUSPENDED','COMPLETED'];
	private lockEditingStatus = ['CLOSED','DECLINED','CANCELLED','COMPLETED'];
	private triggerInviteOnLoad: boolean = false;
	private scrollSection: string = "";
	public verifiedAccess: boolean = false;
	public tnName: string = "";
	public isFeesPopup: boolean = false;
	public hideLoadingForFee: boolean = false;

	constructor(
		public profileService: ProfileService,
		public authService: AuthService,
		public commonService: CommonService,
		public notifyService: NotifyService,
		private socket: SocketService,
		private ngZone: NgZone,
		protected lessonService: LessonService,
		private translate: TranslatePipe,
		public cookieService: CookieService,
		private safeHtml: SafeHtmlPipe,
		public route: ActivatedRoute,
		public router: Router,
	) { 
		if(this.router.url.includes("operations")){
			this.launchOperation = true;
			this.parentComponent = 'operations';
		}else{
			this.launchOperation = false;
		}
	}

	ngOnInit() {
		this.user = this.authService.loadUser();
		console.log('this-user', this.user);
        this.subUrl = this.router.events.subscribe((event:any) => { 
	    	if (event instanceof NavigationEnd){
	    		// console.log('event.url',event.url.includes("operations"));
	    		if(event.url.includes("operations")){
	    			this.launchOperation = true;
	    			this.parentComponent = 'operations';
	    		}else{
	    			this.launchOperation = false;
	    		}
	    	}
	    });
	    this.subParam = this.route.params.subscribe(params => {
	        this.tnId = params['objectId'];
	        this.requestId = params['requestId'];
	        if (this.tnId) {
	          	this.loadTn();
	          	if(this.requestId == 'gftalentnook'){
	          		this.triggerInviteOnLoad = true;
	          	}
	        } else {
	        	console.log('subParam',this.tnId);
	          	this.router.navigate(['/']);
	        }
	    });

	    // If invitation sent to students then need to reload the updated talentnook;
	    this.invitationSubscription = this.notifyService.notifyStudentInvitationObservable$.subscribe((res) => {
	    	// console.log('invitationSubscription notifyStudentInvitationObservable$',res);
			if (res.hasOwnProperty('studentInvitationSent') && 
				res.studentInvitationSent === true && 
				res.hasOwnProperty('updatedTalentnook') && 
				res.updatedTalentnook._id
			) {
				this.talentnook = res.updatedTalentnook;
			}
	    });
	    // Seen unseen message update
	    this.unseenSubscription = this.socket.notifyUnreadObservable$.subscribe((res) => {
	      	console.log('unseenSubscription notifyUnreadObservable$',res);
	      	if(res.hasOwnProperty('action') && res.data){
		      	if(res.action == 'totalUnseenMsg' && res.data) {
		      		if(res.data && res.data.unseenMsg>=0){
		        		this.msgData.unseenMsg = res.data.unseenMsg;
		      		}
		      	}
	      	}
	    });

	    this.launch_tnlaunch_info = this.translate.transform("launch_tnlaunch_info");
	    this.infoBoxTitle = this.translate.transform("schedule_updated");
	    this.infoBoxDescription = this.translate.transform("alert_schedule_updated");
	}
	ngAfterViewInit(){
		let self = this;
		jQuery("#alert-pop").on("hidden.bs.modal", function () {
	    	if(self.scrollSection!=""){
	    		// setTimeout(function(){ self.scrollToComponent(); }, 300);
	    		setTimeout(function(){ self.commonService.scrollToComponent(self.scrollSection, 'requestlist-container', function(){ self.requestlistCom.openPickSchedule(); }); }, 300);
	    	}
	    });
	    jQuery("#info-box-popup").on("hidden.bs.modal", function () {
	    	if(self.isFeesPopup){
	    		setTimeout(function(){ self.commonService.scrollToComponent('feesSection', 'requestlist-container', function(){ 
	    			// Nothing to do.
	    		}); }, 300);
	    	}
	    });

	    // To update unseen initially on focus message board section.
	    this.ngZone.runOutsideAngular(() => {
			window.onscroll = () => {
				let msgContainer = document.getElementById('msgboard-maincontainer');
				if(msgContainer){
					let diff = msgContainer.offsetTop - window.scrollY;
					if(diff>0 && (diff >= 150 && diff<=260)){					
						this.ngZone.run(() => {
							this.updateInitialUnseenMessages();
						});
					}
				}
	  			// console.log(window.innerHeight, window.scrollY, msgContainer.offsetTop, msgContainer.scrollTop, msgContainer.scrollHeight );
			}
	    });
	}
	ngOnDestroy() {
	    if(this.subUrl){
	      this.subUrl.unsubscribe();
	    }
	    if(this.subParam){
	      this.subParam.unsubscribe();
	    }
	    if(this.invitationSubscription){
	      this.invitationSubscription.unsubscribe();
	    }
	    if(this.unseenSubscription){
	      this.unseenSubscription.unsubscribe();
	    }
	}
	setHeaderMessage(){
		// console.log(this.msgCountData.length);
		if(this.msgCountData && this.msgCountData.length>0){
			let totalUnseenMsg = 0;
			for (var i = this.msgCountData.length - 1; i >= 0; i--) {
				totalUnseenMsg = totalUnseenMsg + ((this.msgCountData[i].unseenMsg)? this.msgCountData[i].unseenMsg : 0);
			}
			this.msgData = {unseenMsg : totalUnseenMsg};
		}else{
			this.msgData = {unseenMsg : 0};
		}

		let msgCookie = this.cookieService.get('header_msgfor_launch_page');
	    if(!_.isEmpty(msgCookie)){
	    	let msgTxt = "";
	    	if(msgCookie=='PARENT_JOIN_REQUEST'){
		    	// this.header_msg = this.translate.transform("HEADER_PARENT_JOIN_REQUEST_MSG");
		    	msgTxt = this.translate.transform("header_parent_join_request_msg");
	    		this.header_msg = _.replace(msgTxt, '{{TMNAME}}', this.tmuser.fname);
	    	}else if(msgCookie=='PARENT_NEW_REQUEST'){
		    	// this.header_msg = this.translate.transform("HEADER_PARENT_NEW_REQUEST_MSG");
		    	msgTxt = this.translate.transform("header_parent_new_request_msg");
	    		this.header_msg = _.replace(msgTxt, '{{TMNAME}}', this.tmuser.fname);
	    	}
	    	this.cookieService.set('header_msgfor_launch_page','');
	    }
	}

	loadTn(){
		this.commonService.notifyFlashMsgChanges({isLoading:1})
		// console.log('this.userContainer', this.user._id);
		let data = {tnId:this.tnId,userId: this.user._id};
		this.lessonService.getDetailWithCount(data).subscribe(jsonData => {
			if(jsonData.error==1){
				this.router.navigate(['/404']);
			}else{
				this.talentnook = jsonData.lesson;
				this.msgCountData = jsonData.msgData;	
				this.getTalentnookName();

				if(this.talentnook && this.talentnook.status){
					if(this.talentnook.status == 'DRAFT' && this.talentnook.tmId && this.user._id && this.user._id == this.talentnook.tmId._id){
						this.router.navigate(['/lesson/'+this.talentnook._id]);
					}else if(this.launchOperation){
						let allowedStatus = ['ACTIVE','CLOSED','DECLINED','CANCELLED','SUSPENDED','COMPLETED'];
						if(_.indexOf(allowedStatus,this.talentnook.status)!=-1){
							if(this.commonService.isParticipantOfTN(this.talentnook, this.user)){
								if(this.commonService.validateTNUserAccess('operations',this.talentnook, this.user)){
									this.verifiedAccess = true;

									this.updateUsers();
									this.setHeaderMessage();
									this.dataLoaded = true;	
									// IF redirecting from grandfathering then need to show this invite popup.
									if(this.triggerInviteOnLoad && this.talentnook.isGrandfathering){
										this.inviteStudent();
									}
								}else{
									this.router.navigate(['/lesson/access/'+this.talentnook._id]);
								}
							}else{
								console.log('unauthorized 1');
								this.router.navigate(['/unauthorized']);
							}
							// if(this.validateUserAccess()){
							/*if(this.validateUserAccess()){
								this.updateUsers();
								this.setHeaderMessage();
								this.dataLoaded = true;
							}else{
								// TODO: No any such user can access who is not part of this TN
								console.log('User not authorized (1)');
								this.router.navigate(['/unauthorized']);
							}*/						
						}else{
							// console.log('User not authorized (2)');
							// this.router.navigate(['/unauthorized']);
							if(this.commonService.isParticipantOfTN(this.talentnook, this.user)){
								if(this.commonService.validateTNUserAccess('launch',this.talentnook, this.user)){
									this.router.navigate(['/lesson/launch/'+this.talentnook._id]);
								}else{
									console.log('unauthorized 2');
									this.router.navigate(['/unauthorized']);
								}
							}else{
								console.log('unauthorized 3');
								this.router.navigate(['/unauthorized']);
							}
						}
					}else{
						// TODO: Need to add restriction criteria, right now this is active until TN active.
						// let allowedStatus = ['CLOSED','DECLINED','CANCELLED','SUSPENDED','COMPLETED'];
						let allowedStatus = ['REQUESTED','ACKNOWLEDGED'];
						if(_.indexOf(allowedStatus,this.talentnook.status)!=-1){
							// TODO: If user can access operations then redirecton that otherwise tn access page.
							if(this.commonService.isParticipantOfTN(this.talentnook, this.user)){
								if(this.commonService.validateTNUserAccess('launch',this.talentnook, this.user)){
									this.verifiedAccess = true;

									this.updateUsers();
									this.setHeaderMessage();
									this.dataLoaded = true;	

									// IF redirecting from grandfathering then need to show this invite popup.
									if(this.triggerInviteOnLoad && this.talentnook.isGrandfathering){
										this.inviteStudent();
									}	
								}else{
									this.router.navigate(['/lesson/access/'+this.talentnook._id]);
								}
							}else{
								console.log('unauthorized 4');
								this.router.navigate(['/unauthorized']);
							}
						}else{
							if(this.commonService.isParticipantOfTN(this.talentnook, this.user)){
								if(this.commonService.validateTNUserAccess('operations',this.talentnook, this.user)){
									this.router.navigate(['/lesson/operations/'+this.talentnook._id]);
								}else{
									this.router.navigate(['/lesson/access/'+this.talentnook._id]);
								}
							}else{
								console.log('unauthorized 5');
								this.router.navigate(['/unauthorized']);
							}
						}
					}
				}
				this.commonService.notifyFlashMsgChanges({isLoading:0});
			}
		},err =>{
			this.commonService.notifyFlashMsgChanges({isLoading:0});
		});
	}
	getTalentnookName(){
		if(this.talentnook && this.talentnook.name && !_.isEmpty(this.talentnook.name)){
			if(this.talentnook.status && this.talentnook.status!="REQUESTED" && this.talentnook.status!="ACKNOWLEDGED"){
				this.tnName = this.talentnook.name;
			}else{
				let request_for = this.translate.transform('request_for');
				this.tnName = request_for+' '+this.talentnook.name;
			}
		}
	}
	inviteStudent() {
		let inviteData = {showInvite: true, isStudentInvite: true, studentInviteData: {fromUser: this.user._id, lessonId: this.talentnook._id, isGrandfathering: this.talentnook.isGrandfathering, userViewMode: this.userViewMode}};
		this.notifyService.notifyInvitationChanges(inviteData);
	}
	updateUsers(){
		this.tmuser = this.talentnook.tmId;
		this.hostuser = this.talentnook.hostId;
		this.userContainer = {tmuser: this.tmuser, hostuser: this.hostuser, user: this.user};

		console.log('userContainer',this.userContainer, this.tmuser._id, this.user._id);

		if(this.tmuser && this.tmuser._id && this.user._id && this.tmuser._id == this.user._id){
			if(_.indexOf(this.lockEditingStatus,this.talentnook.status)!=-1){
				this.isEditable = false;
			}else {
				this.isEditable = true;
				this.isParentEditable = true;
			}
			this.gridViewMode = 'tm';
			this.userViewMode = 'TM';
		}else{
			if(_.indexOf(this.lockEditingStatus,this.talentnook.status)!=-1){
				this.isParentEditable = false;
			}else{
				this.isParentEditable = true;
			}
			this.gridViewMode = 'user';
			this.userViewMode = 'PARENT';
		}
	}
	/*validateUserAccess(){
		if(this.talentnook && this.talentnook.tmId && this.talentnook.students){
			// console.log(this.user._id, ' --- ', this.talentnook.tmId._id);
			if(this.user._id == this.talentnook.tmId._id){
				return true;
			}else {
				for (var i = this.talentnook.students.length - 1; i >= 0; i--) {
					// console.log(this.talentnook.students[i].parent._id);
					if(this.talentnook.students[i].parent && this.talentnook.students[i].parent._id == this.user._id){
						return true;
					}
				}
				return false;
			}
		}else{
			return false;
		}
	}*/
	updateInitialUnseenMessages(){
		if(this.initialMessageUpdate){ return false; }
		this.messageBoardCom.updateSeenMsgTotal();
		this.initialMessageUpdate = true;
	}


	// Child component related functions
	saveLessonDetail(event){
		console.log('saveLessonDetail',event);
		this.lessonDetailEdit = true;
	    this.save(event.model,event.isValid,event.form);
	}

	saveLessonOutlineDetail(event){
		console.log('saveLessonOutlineDetail',event);
		this.lessonOutlineEdit = true;
	    this.save(event.model,event.isValid,event.form);
	}

	saveFeesDetail(event){
		console.log('saveFeesDetail',event);
		this.feesEdit = true;
	    this.save(event.model,event.isValid,event.form);
	}

	savePolicyDetail(event){
		console.log('savePolicyDetail',event);
		this.policyEdit = true;
	    this.save(event.model,event.isValid,event.form);
	}	

	saveRequestlist(event){
		console.log('saveRequestlist - tnRequestAcceptRejectForm - tnPickedSchedule', event);
		if(event.form == 'tnRequestAcceptRejectForm'){
			this.save(event.model, event.isValid, event.form);
		}else if(event.form == 'tnUpdateSchedule'){
			this.save(event.model, event.isValid, event.form);
		}else if(event.form == 'tnPickedSchedule'){
			// this.save(event.model, event.isValid, event.form);
			let modeldata = {};
			if(event.hasNewScheduleData){
				modeldata = event.model;
			}else{
				modeldata = {"schedule": event.selectedRequestForSchedule};
			}
			this.save(modeldata, event.isValid, event.form);
			// EXPERIMENT ONLY TO TEST MERGE
			/*let modeldata2 = _.clone(event.model.schedule);
			let modeldata3 = _.clone(event.selectedRequestForSchedule);
			let mergedSchedule = _.merge(modeldata2, modeldata3);
			console.log('mergedSchedule', mergedSchedule, event.model.schedule, event.selectedRequestForSchedule, modeldata2, modeldata3);*/
			// EXPERIMENT ONLY TO TEST MERGE
		}
	}

	saveHostDetail(event){
		// console.log('saveHostDetail',event);
		if(event.model.isMakeMeHost){
			if(event.model.makeMeHost){
				let modelval = {'hostId': event.model.hostId};
				this.save(modelval, event.isValid, event.form);
			}else{
				// We will have always true type of request if tm is not not host otherwise not.
			}
		}else{
			if(event.model.hostId){
				let modelval = {'hostId': event.model.hostId, 'studentHostId': event.model.studentHostId};
				this.save(modelval, event.isValid, event.form);
			}
		}
	}

	saveAcceptDeclineRequest(event){
		console.log('saveAcceptDeclineRequest',event);
		if(event.model.acceptDecline){
			if(this.validateRequired()){
				this.save(event.model, event.isValid, event.form);
			}
		}else {
			// There are two form can be sent in false case
			// One for decline and one for acknowledge with param isAacknowledged:true and formane tnAcknowledgeForm
			// this data is coming already from header which is triggring this event.
			this.save(event.model, event.isValid, event.form);
		}
	}
	askForValidationORConfirm(event:any){
		if(this.validateRequired()){
			// this.save(event.model, event.isValid, event.form);
			this.tnheader.acceptDecline(true);
		}
	}

	/*scrollToComponent(){
		let self = this;
		console.log("this.scrollSection", this.scrollSection);
		if(this.scrollSection!="" && jQuery("#"+self.scrollSection)){
			jQuery('html, body').animate({
		        scrollTop: (jQuery("#"+self.scrollSection).offset().top - 160)
		    }, 1200);

			if(self.scrollSection=='requestlist-container'){
				setTimeout(function(){
					self.requestlistCom.openPickSchedule();
				},1500);
			}
		}
	}*/
	validateRequired(){
		let hasError = false;
		this.buggyComponent = [];

		if(!(this.lessondetailCom.isValidForm())){
			this.lessondetailCom.enableDisableEdit(true);
			this.lessondetailCom.submitForm();
			
			this.buggyComponent.push('lessonDetailSection');
			this.scrollSection = 'lessonsDetailSection';
			hasError = true;
		}
		if(!(this.talentnook.hostId && this.talentnook.hostId._id)){
			this.buggyComponent.push('hostSection');
			if(!hasError){
				this.scrollSection = 'hostSection';
			}
			hasError = true;
		}
		if(!(this.hasScheduleData())){
			this.buggyComponent.push('pickScheduleSection');
			if(!hasError){
				this.scrollSection = 'requestlist-container';
			}
			hasError = true;
		}
		if(!(this.feesCom.isValidForm())){
			this.feesCom.enableDisableEdit(true);
			this.feesCom.submitForm();

			this.buggyComponent.push('feesSection');
			if(!hasError){
				this.scrollSection = 'feesSection';
			}
			hasError = true;
		}

		// Check if any student is accepted or not.
		if(this.talentnook && this.talentnook.students && this.talentnook.students.length>0){
			let hasStudentError = true;
			for (var i = this.talentnook.students.length - 1; i >= 0; i--) {
				console.log(this.talentnook.students[i].currentStatus);
				if(this.talentnook.students[i] && this.talentnook.students[i].currentStatus=='ACCEPTED'){
					hasStudentError = false;
				}
			}
			console.log(hasStudentError);
			if(hasStudentError){
				this.buggyComponent.push('studentListSection');
				if(!hasError){
					this.scrollSection = 'studentListSection';
				}
				hasError = true;
			}
		}else{
			console.log('hasStudentError');
			this.buggyComponent.push('studentListSection');
			if(!hasError){
				this.scrollSection = 'studentListSection';
			}
			hasError = true;
		}


		if(hasError){
			jQuery('#alert-pop').modal('show');
			return false;	
		}else{
			return true;
		}
	}
	hasScheduleData(){
		let returnVal = false;
		_.forEach(this.talentnook.schedule, function(value) {
	        if(value.length>0){
	          returnVal = true;
	        }
	    });
		return returnVal;
	}

	// TO SAVE THE FORMS DATA
	save(model: any, isValid: boolean, form:String) {
		console.log('form',form);
		
		if(this.isSingleForm){ return false; }

	    switch (form) {
	      case "tnFormLessonOutline":
	      case "tmFormLessonOutline":
	      
	      case "tnFormFees": 
	      case "tmFormFees": 

	      case "tnFormPolicy":
	      case "tmFormPolicy":

	      case "tnFormLessonDetail":
	      case "tmFormLessonDetail":

	      case "tnHostDetail":
	      case "tnAacceptDeclineForm":
	      case "tnAcknowledgeForm":

	      case "tnOperationActionForm":
	      case "tnChangeHostDetail":
	      
	      case "tnUpdateSchedule":
	        if(isValid){
	          // this.saveTnProfile(this.user.tm, 'DRAFT');
	          /*let status = "DRAFT";
	          if(this.talentnook._id && !_.isEmpty(this.talentnook._id)){
	          	status = this.talentnook.status;
	          }*/
	          this.saveTalentnookDetail(model, form, status);
	        }
	        break;
	      case "tnRequestAcceptRejectForm":
	      	if(isValid){
	      		let modeldata = {isAccept: model.isAccept, requestIds : []};
	      		for (var i = model.students.length - 1; i >= 0; i--) {
	      			if(!_.isEmpty(model.students[i].requestId)){
	      				modeldata.requestIds.push(model.students[i].requestId);
	      			}
	      		}
	      		modeldata['viewMode'] = this.userViewMode;
	      		this.saveTalentnookDetail(modeldata, form, status);	
	      	}
	        break;
	      case "tnFormSchedule":
	      case "tmFormSchedule":
	      	/*if(isValid){
	          let that = this;
	          let modelObject = _.transform(model, function(result, value, key) {
	            result['schedule'] = that.profileService.convertFormat(value);
	          }, {});
	          this.user.tm.schedule = modelObject.schedule;
	          
	          let status = "DRAFT";
	          if(this.talentnook._id && !_.isEmpty(this.talentnook._id)){
	          	status = this.talentnook.status;
	          }

	          this.saveTnProfile(modelObject, form, status);
	        }*/
	      	console.log('tnFormSchedule tmFormSchedule');
	      	break;
	      case "tnPickedSchedule":
	        /*if(isValid){
	          let that = this;
	          let modelObject = _.transform(model, function(result, value, key) {
	            result['schedule'] = that.profileService.convertFormat(value);
	          }, {});
	          this.user.tm.schedule = modelObject.schedule;
	          
	          let status = "DRAFT";
	          if(this.talentnook._id && !_.isEmpty(this.talentnook._id)){
	          	status = this.talentnook.status;
	          }

	          this.saveTnProfile(modelObject, form, status);
	        }*/
	        this.saveTalentnookDetail(model, form, status);
	        break;
	    }
	}

	saveTalentnookDetail(model, formName, status) : any {
		if(_.isEmpty(this.talentnook._id)){ return false; }

		model.formName = formName;
		model._id = (this.talentnook._id)? this.talentnook._id : "";
		// console.log('saveTalentnookDetail', model, status, this.user.tm.editId);
		// return false;
		if(!this.hideLoadingForFee){
			this.commonService.notifyFlashMsgChanges({isLoading:1});
		}
		this.hideLoadingForFee = false;

	    this.lessonService.saveTalentnookDetail(model).subscribe(jsonData => {
	    	this.commonService.notifyFlashMsgChanges({isLoading:0});
	    	// console.log(jsonData);
	    	let oldStudentNumber = (this.talentnook && this.talentnook.studentPerSession)? this.talentnook.studentPerSession : 0;
	      	if(jsonData && jsonData.error==0){
	      		this.talentnook = jsonData.data;
		    	this.updateUsers();
		      	if(!this.isSingleForm){ 
		      		this.resetAllForms();
		      	}

	      		if(formName.indexOf('tnAacceptDeclineForm')!=-1 && !model.acceptDecline){
	      			// TODO: if user lauched or declined then need to take appropriate redirection.
		      		// this.router.navigate(['/mylessons']);		      		
			      	this.router.navigate(['/mylessons']);

	      		}else if(formName.indexOf('tnAacceptDeclineForm')!=-1 && model.acceptDecline && this.talentnook.status=='ACTIVE'){
		      		// TODO: if user lauched then need to take appropriate redirection.
		      		this.router.navigate(['/lesson/operations/'+this.talentnook._id]);

		      	}else if(formName.indexOf('tnChangeHostDetail')!=-1){
			      	// Show some confirmation that we have sent reqeust to admin.
			      	this.showInfoMessage('changehost');
		      	}else if(formName.indexOf('tnPickedSchedule')!=-1){
			      	this.showInfoMessage('scheduleupdate');
		      	}else if(formName.indexOf('tnFormLessonDetail')!=-1 || formName.indexOf('tmFormLessonDetail')!=-1){

					// console.log("oldStudentNumber!=this.talentnook.studentPerSession", oldStudentNumber, this.talentnook.studentPerSession)
					if(oldStudentNumber!=this.talentnook.studentPerSession){
						if(this.feesCom && this.talentnook && this.talentnook.fees && this.talentnook.fees.isGroupDiscount && this.talentnook.fees.isGroupDiscount.toLowerCase()=='yes'){
							// this.scrollSection = 'feesSection';
							this.showInfoMessage('feesneedtoupdate');
							let self = this;
							setTimeout(function(){
								if(!(self.feesCom.isValidForm())){
									// console.log("In if saved")
									self.hideLoadingForFee = false;
									self.feesCom.enableDisableEdit(true);
									self.feesCom.submitForm();
								}else{
									// console.log("In else saved")
									self.hideLoadingForFee = true;
									self.feesCom.enableDisableEdit(true);
									
									if(self.feesCom.isValidForm()){
										self.feesCom.submitForm();
										self.feesCom.enableDisableEdit(false);
									}
								}
							},300);
						}
					}
		      	}
	      	}else{
	      		window.location.reload();
	      	}
	    },
	    err => {   
	    	if(!this.isSingleForm){ 
	      		this.resetAllForms();
	      	}   
	      	this.commonService.notifyFlashMsgChanges({isLoading:0});
	    });
	}

	resetAllForms(){
		// this.submitted = false;
		// this.headlineSubmit = false;

	    // this.embedEdit = false;
	    // this.skillEdit = false;
	    // this.scheduleEdit = false;
	    // this.headlineEdit = false;
	    // this.noofSlotEdit = false;
	    // this.bannerEdit = false;
	    this.lessonDetailEdit = false;
	    this.lessonOutlineEdit = false;
	    this.feesEdit = false;
	    this.policyEdit = false;
	}

	showInfoMessage(messagebox){
		this.isFeesPopup = false;
		if(messagebox=='changehost'){
			this.infoBoxTitle = this.translate.transform("changehost_title");
	    	this.infoBoxDescription = this.translate.transform("changehost_err_message");

			jQuery("#info-box-popup").modal('show');
		}else if(messagebox=='scheduleupdate'){
			this.infoBoxTitle = this.translate.transform("schedule_updated");
	    	this.infoBoxDescription = this.translate.transform("alert_schedule_updated");

			jQuery("#info-box-popup").modal('show');
		}else if(messagebox=='feesneedtoupdate'){
			this.infoBoxTitle = this.translate.transform("feesneedtochange_title");
	    	this.infoBoxDescription = this.translate.transform("feesneedtoupdate_warning_msg");

			this.isFeesPopup = true;
			jQuery("#info-box-popup").modal('show');
		}
	}
}
