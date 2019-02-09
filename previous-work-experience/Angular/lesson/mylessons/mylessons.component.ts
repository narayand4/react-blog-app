import { Component, OnInit, Input, ViewChild, ElementRef, ViewEncapsulation } from '@angular/core';
import { Router, ActivatedRoute, Params, NavigationEnd } from '@angular/router';
import { TranslatePipe } from 'ng2-translate';
import { CookieService } from 'ng2-cookies';
import { environment } from '../../../environments/environment';

import { AuthService } from '../../common/auth.service';
import { CommonService } from '../../common/common.service';
import { NotifyService } from '../../common/notify.service';
import { ProfileService } from '../../profile/profile.service';
import { LessonService } from '../lesson.service';
import { SocketService } from '../../common/socket.service';
// import { TimeAgoPipe } from '../../pipes/time-ago';
// import { UserService } from '../../user/user.service';
// import { CmsService } from '../../cms/cms.service';

import { phoneValidator, numberValidator, emailValidator, rangeValidator, zipValidator } from '../../validators/custom-validation';

declare var jQuery:any;
import _ from 'lodash';

@Component({
	selector: 'app-mylessons',
	templateUrl: './mylessons.component.html',
	styleUrls: ['./mylessons.component.css'],
	encapsulation: ViewEncapsulation.None,
	providers: [LessonService, ProfileService, TranslatePipe]
})
export class MylessonsComponent implements OnInit {

	public env: any = environment;
	public user: any = {};
	public sub : any;
	public routeEventsub : any;
	public msgBoardSubscription : any;

	public dataLoaded = false;
	public parentRoute = false;
	public rightpanelViewmode = "";

	public lessons: any;
	public talentnookPayments: any;
	public unseenCountData: any;
	public gridData: any = {
	    'newrequest': [],
	    'ongoing': [],
	    'acknoledged': [],
	    'published': [],
	    'completed': [],
	    'inactive': [],
	    'draft': [],
	};
	allfilters: any;

	public currentUrl: string = '';
	public tabsStatus: any = {newrequest: true, ongoing: false, acknoledged: false, published: false, completed: false, inactive: false, draft: false};
	public hintsPopup: any = {newrequest: true, ongoing: true, acknoledged: true, published: true, completed: true, inactive: true, draft: true};

	public inlinePopupPosition:string = 'right';
    public tooltipTriggeringPoint: any;
    public inlinePopupEnabled: boolean = false;
    public tooltipLesson: any = {};
    public lessonType: string = '';
    public tooltipAction: string = '';

    public sideVCardData: any = {};

    public yesButton: string = '';
    public noButton: string = '';
    public confirmTitle: string = '';
    public showReasonBox: boolean = false;
    public globalErrorMsg: string = '';
    public confirmContent: string = '';
    public showConfirm = false;

	constructor(
	    // public userService: UserService,
		public authService: AuthService,
	    public commonService: CommonService,
	    public notifyService: NotifyService,
	    public profileService: ProfileService,
	    public router: Router,
	    private activatedRoute: ActivatedRoute,
	  	public cookieService: CookieService,
	    private translate: TranslatePipe,
	    protected lessonService: LessonService,
	    private socket: SocketService,
	) { }

	ngOnInit() {
		// this.user = this.authService.loadUser();
		let type = this.activatedRoute.snapshot.queryParams["type"];
		if(type && type!=""){
			let currentActiveTab = this.getCurrentActiveTab();
        	this.resetAllTabs();
        	// console.log(type);
        	this.changeTab(type);
		}
		
		/*this.sub = this.activatedRoute.params.subscribe(params => {
			console.log('params', params);
            if(params['type'] && !_.isEmpty(params['type'])){
            	let currentActiveTab = this.getCurrentActiveTab();
            	this.resetAllTabs();
            	console.log(params['type']);
            	switch (params['type']) {
            		case "newrequest":
            		case "ongoing":
            		case "acknoledged":
            		case "published":
            		case "completed":
            		case "inactive":
            		case "draft":
            			this.tabsStatus[params['type']] = true;
            			break;
            		default:
            			this.tabsStatus[currentActiveTab] = true;
            			break;
            	}
            }
        });*/

        this.routeEventsub = this.router.events.subscribe((event:any) => { 
	    	if (event instanceof NavigationEnd){
	    		console.log('event.url',event.url.includes("parentview"));
	    		if(event.url.includes("parentview")){
	    			this.parentRoute = true;
	    			// this.selectionType = 'parentview';
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
				// this.leftpanelViewmode = 'PARENT';
				if(this.authService.isParent(this.user) && this.authService.isTM(this.user) && this.user.totalEnrolledTn && this.user.totalEnrolledTn>0){
					// this.leftpanelViewmode = 'BOTH';
				}
			}else if(this.authService.isTM(this.user)){
				this.rightpanelViewmode = 'TM';
				// this.leftpanelViewmode = 'TM';
				if(this.authService.isParent(this.user) && this.user.totalEnrolledTn && this.user.totalEnrolledTn>0){
					// this.leftpanelViewmode = 'BOTH';
				}
			}else{
				this.rightpanelViewmode = 'PARENT';
				// this.leftpanelViewmode = 'PARENT';
			}
			// console.log(this.rightpanelViewmode,this.leftpanelViewmode,this.parentRoute);
			// this.getErrorMessage();
			this.loadLazy();
		},err =>{
			this.commonService.notifyFlashMsgChanges({isLoading:0})
		});

		this.yesButton = this.translate.transform('yes');
        this.noButton = this.translate.transform('no');
        this.confirmTitle = this.translate.transform('lesson_delete_confirm_title');
        this.confirmContent = this.translate.transform('lesson_delete_confirm_content');
		// this.loadLazy();
	}

	ngOnDestroy() {
      	if(this.sub){
	      this.sub.unsubscribe();
	    }
	    if(this.routeEventsub){
	      this.routeEventsub.unsubscribe();
	    }
	    if(this.msgBoardSubscription){
	      this.msgBoardSubscription.unsubscribe();
	    }
    }
    resetAllTabs(){
    	this.tabsStatus.newrequest = false;
    	this.tabsStatus.ongoing = false;
    	this.tabsStatus.acknoledged = false;
    	this.tabsStatus.published = false;
    	this.tabsStatus.completed = false;
    	this.tabsStatus.inactive = false;
    	this.tabsStatus.draft = false;
    }
    getCurrentActiveTab(){
    	return (this.tabsStatus.newrequest)? 'newrequest': (this.tabsStatus.ongoing)? 'ongoing': (this.tabsStatus.acknoledged)? 'acknoledged': (this.tabsStatus.published)? 'published': (this.tabsStatus.completed)? 'completed':(this.tabsStatus.inactive)? 'inactive': (this.tabsStatus.draft)? 'draft': ''; 
    }
    changeTab(tab, event:any=false){
    	if(event){
    		console.log("event.target.value", event.target.value);
    		tab = (event.target.value)? event.target.value.toLowerCase(): '';
    	}
    	if(tab){
    		// Set side vertical card data if draft is selected.
    		if(tab=='draft' && this.gridData['draft'] && this.gridData['draft'][0]){ this.sideVCardData = this.gridData['draft'][0]; }

    		this.resetAllTabs();
    		this.tabsStatus[tab] = true;
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

    updateGridData(updateSeenUnseen:boolean=false){
    	if(!updateSeenUnseen){
	    	this.gridData = {
			    'newrequest': [],
			    'ongoing': [],
			    'acknoledged': [],
			    'published': [],
			    'completed': [],
			    'inactive': [],
			    'draft': [],
			};
		}

  		let gridDataTemp = _.clone(this.gridData);
  		for(var i=0; i<this.lessons.length; i++){
  			if(updateSeenUnseen){
				let msgCount = this.getUnseenCount(this.lessons[i]);
				this.lessons[i].totalUnseenMsg = msgCount;
				// console.log(this.lessons[i]._id, msgCount);
  			}

			if(this.lessons[i].status=="REQUESTED" || this.lessons[i].status=="ACKNOWLEDGED"){
			  	gridDataTemp['newrequest'].push(this.lessons[i]);
			  	// this.hasTalentnooks = true;
			}
			if(this.lessons[i].status=="ACTIVE"){
			  	gridDataTemp['ongoing'].push(this.lessons[i]);
			  	// this.hasTalentnooks = true;
			}
			if(this.lessons[i].status=="PUBLISHED" && this.lessons[i].lessonType=="AVAILABLE"){
			  	gridDataTemp['published'].push(this.lessons[i]);
			  	// this.hasTalentnooks = true;
			}
			if(this.lessons[i].status=="COMPLETED"){
			  	gridDataTemp['completed'].push(this.lessons[i]);
			  	// this.hasTalentnooks = true;
			}
			if(this.lessons[i].status=="CANCELED" || this.lessons[i].status=="DELETED" || 
				this.lessons[i].status=="SUSPENDED"  || this.lessons[i].status=="DECLINED" || 
				this.lessons[i].status=="INACTIVE" || this.lessons[i].status=="CLOSED"){
				// console.log(this.lessons[i].status);
			  	gridDataTemp['inactive'].push(this.lessons[i]);
			  	// this.hasTalentnooks = true;
			}
			if(this.lessons[i].status=="DRAFT" || this.lessons[i].status=="NOTLAUNCHED"){
			  	gridDataTemp['draft'].push(this.lessons[i]);
			  	if(!this.sideVCardData || !this.sideVCardData._id){
			  		this.sideVCardData = this.lessons[i];
			  	}
			  	// this.hasTalentnooks = true;
			}
		}
		// Update once instead of in loop it will trigger multiple change listner.
		this.gridData = gridDataTemp;
  	}
  	updateVCardData(lesson:any={}){
  		if(lesson && lesson._id){
  			this.sideVCardData = lesson;
  		}
  	}

  	// RELATED TO UPDATE SEEN AND UNSEEN MESSAGES
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
  	getTalentnookwisePayment(tnId){
		let talentnookPayment = 0;
		if(this.talentnookPayments.length > 0){
			for(var i=0; i<this.talentnookPayments.length; i++){
				if(tnId==this.talentnookPayments[i]._id){
					talentnookPayment += this.talentnookPayments[i].paymentAmount;
				}
			}
		}
		return talentnookPayment;
	}
  	// RELATED TO UPDATE SEEN AND UNSEEN MESSAGES FINISHED

  	// FOR THE TOOLTIP OPITIONS
	// showOptionTooltip(event){
	showOptionTooltip(event, lesson, type){
		this.lessonType = type;
		this.tooltipLesson = lesson;

		let target = event.target || event.srcElement || event.currentTarget;
        target = target.offsetParent;

        let mainTarget: ElementRef;
        mainTarget = target;

        // console.log("lesson", mainTarget, lesson);
        // let pos = this.commonService.getPosition(elem.nativeElement);        
        if(mainTarget){
			this.inlinePopupPosition = 'right';

	        // this.tooltipTriggeringPoint = event;
	        this.tooltipTriggeringPoint = mainTarget;
	        this.inlinePopupEnabled = true;
	    }
	}
	onHideTooltip(event){
		console.log('onHideTooltip',event);
        this.inlinePopupEnabled = false;
        if(event && event.showInlinePopup){
            // this.oldMarkerId = '';
            // this.changeRedMarker(this.oldMarkerId);
        }
	}
	lessonOptionCta(action){
		console.log("lessonOptionCta", action);
		this.tooltipAction = '';
		if(this.tooltipLesson && this.tooltipLesson._id){
			this.tooltipAction = action;
			if(action=='editLesson'){
				switch (this.lessonType) {
					case "newrequest":
						this.router.navigate(['/launch/'+this.tooltipLesson._id]);
					case "ongoing":
						this.router.navigate(['/operations/'+this.tooltipLesson._id]);
						break;
					case "draft":
					case "published":
						this.router.navigate(['/editlesson/'+this.tooltipLesson._id]);
						break;
				}
			}else if(action=='deleteLesson'){
				this.onHideTooltip(null);
				this.showConfirm = true;
			}else{
				this.lessonOperations(action,this.tooltipLesson, this.lessonType);
			}
		}
	}
	confirmOutput(response){
        this.showConfirm = false;
        if(response.response){
        	this.lessonOperations(this.tooltipAction, this.tooltipLesson, this.lessonType);
        }
    }
	lessonOperations(action, lesson, type){
	    this.onHideTooltip(null);
		let lessonOperationsData = { action: action, lessonId: lesson._id };

	    this.commonService.notifyFlashMsgChanges({isLoading:1});
		this.lessonService.lessonOperations(lessonOperationsData).subscribe(jsonData => {
			if(jsonData && jsonData.error==0 && jsonData.data && jsonData.data._id){
				if(action=='duplicateLesson'){
					console.log('this.lessons.length',_.clone(this.lessons.length))
					this.lessons.unshift(jsonData.data);
					console.log('this.lessons.length', _.clone(this.lessons.length))
					this.updateGridData();
				}else if(action=='deleteLesson' || action=='publishLesson'  || action=='activeLesson' || action=='markAsCompleteLesson'){
					// this.gridData['inactive'].unshift(jsonData.lesson);
					this.updateLesson(jsonData.data);
				}
			}
			this.commonService.notifyFlashMsgChanges({isLoading:0});
		}, err => {
	    	this.commonService.notifyFlashMsgChanges({isLoading:0});
	    });
	}
	updateLesson(lesson:any={}){
		console.log("updateLesson lesson && lesson._id", lesson);
		if(lesson && lesson._id){
			for (var i = this.lessons.length - 1; i >= 0; i--) {
				if(this.lessons[i]._id==lesson._id){
					this.lessons[i] = lesson;
					console.log("Lesson found to update", i, this.lessons[i]._id, lesson._id);
				}
			}
		}
		this.updateGridData();
	}
	// FOR THE TOOLTIP OPITIONS FINISHED
}
