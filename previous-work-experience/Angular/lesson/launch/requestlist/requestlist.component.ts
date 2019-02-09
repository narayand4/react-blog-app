import { Component, OnInit, Output, Input, ViewChild, EventEmitter, SimpleChange } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormGroup, FormArray, FormControl, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from 'ng2-translate';

import { AuthService } from '../../../common/auth.service';
import { CommonService } from '../../../common/common.service';
import { ProfileService } from '../../../profile/profile.service';
import { NotifyService } from '../../../common/notify.service';

import { FormatSchedule } from '../../../pipes/format-schedule';
import { FormatTimeSchedule } from '../../../pipes/format-time-schedule';
import { NamePipe } from '../../../pipes/name';
import { urlValidator, numberValidator, rangeValidator, timerangeValidator, floatnumberValidator } from '../../../validators/custom-validation';

import _ from 'lodash';
declare var jQuery:any;

@Component({
  selector: 'app-requestlist',
  templateUrl: './requestlist.component.html',
  styleUrls: ['./requestlist.component.css'],
  providers: [FormatSchedule, FormatTimeSchedule, TranslatePipe, NamePipe]
})
export class RequestlistComponent implements OnInit {
	@ViewChild('scheduleCom') scheduleCom;
	@ViewChild('scheduleEditCom') scheduleEditCom;

	@Input('data')
	objectData: any = {};

	@Input('requestListEdit')
	requestListEdit: boolean = false;

	@Input('isEditable')
	isEditable: boolean = false;

	@Input('isSingleForm')
	isSingleForm: boolean = false;

	@Input('userViewMode')
	userViewMode: string = ''; // 'TM'

	@Input('parentComponent')
	parentComponent: string = 'launch'; // 'launch' and 'operations' are the possible values

	@Input('userContainer')
	userContainer: any = {};

	@Output('save')
	saveForm: EventEmitter<any> = new EventEmitter<any>();
	
	@Output('saveHostDetail')
	saveHostDetail: EventEmitter<any> = new EventEmitter<any>();
	

	public tnFormRequest: FormGroup;
	public submitted = false;
	private isInit = false;
	private selectedRequests: any = [];
	public errorMsg: string = "";
	private parentRequests: any = {};

	public pickScheduleEnabled: boolean = false;
	public scheduleData: any = [];
	public hasParentRequest: boolean = true;
	public scheduleEdit: boolean = true;
	
	public dropInlinePopupEnabled: boolean = false;

	// Confirmation
	public showConfirm: boolean = false;
  	public confirmTitle: string = "";
  	public confirmContent: string = "";
  	
  	protected acceptCnfTitle: string = "";
  	protected acceptCnfContent: string = "";

  	protected declineCnfTitle: string = "";
  	protected declineCnfContent: string = "";
  	protected actionType: string = 'accept'; // decline
  	
  	protected yesButton: string = "";
  	protected noButton: string = "";
  	protected yesButton1: string = "";
  	protected yesButton2: string = "";

  	protected user: any = {};

  	protected inlineViewMode: String = '';	// edit-schedule, pick-schedule
  	public inlinePopupEnabled: boolean = false;
  	public inlinePopupPosition: string = 'bottom-left';
  	public triggeringPoint: any;
  	public enableScheduleEditing: boolean = false;
  	public dataToEditSchedule: any = {schedule: []};
  	public currentRequestToEditSchedule: any = {};
  	public deleteConfirmMessage: any = "";

	constructor(
		public profileService: ProfileService,
		public commonService: CommonService,
		private notifyService: NotifyService,
		public authService: AuthService,
		private translate: TranslatePipe,
		private namePipe: NamePipe,
		public router: Router,
		public route: ActivatedRoute,
		private _fb: FormBuilder,
	) { }

	ngOnInit() {
		this.user = this.authService.loadUser();
		this.updateFormData();
		// this.acceptCnfTitle = this.translate.transform('tn_accept_confirm_title');
  		// this.acceptCnfContent = this.translate.transform('tn_accept_confirm_content');

  		this.declineCnfTitle = this.translate.transform('tn_decline_confirm_title');
  		this.declineCnfContent = this.translate.transform('tn_decline_confirm_content');

  		// this.yesButton1 = this.translate.transform('launch_this_lesson');
  		this.yesButton2 = this.translate.transform('yes');
  		this.noButton = this.translate.transform('cancel');

  		this.yesButton = this.yesButton2;
		this.confirmTitle = this.declineCnfTitle;
		this.confirmContent = this.declineCnfContent;
	}

	ngOnChanges(changes: {[propName: string]: SimpleChange}) {
		// console.log('changes',changes);
		if(changes['requestListEdit'] !== undefined){
		  this.requestListEdit = changes['requestListEdit'].currentValue;
		}

		if(changes['objectData'] !== undefined){
		  this.objectData = changes['objectData'].currentValue;
		  this.updateFormData();
		  // console.log('objectData',this.objectData,changes['objectData']);
		}

		if(changes['userViewMode'] !== undefined){
		  	this.userViewMode = changes['userViewMode'].currentValue;
		}		

		if(changes['userContainer'] !== undefined){
		  this.userContainer = changes['userContainer'].currentValue;
		}

		if(changes['isEditable'] !== undefined){
		  	this.isEditable = changes['isEditable'].currentValue;
		  	// Update for the parent if suspended then disable parent CTA's
		  	if(this.objectData && this.objectData.status=="SUSPENDED" && this.isEditable){
	    		console.log('this.objectData.status',this.objectData.status, this.isEditable);
	    		this.isEditable = false;
    		}
		}
	}

	updateFormData(){
		this.isInit = true;
		this.tnFormRequest = this._fb.group({
            students: this._fb.array([])
        });

        if(this.objectData){
        	if(this.objectData.status=="SUSPENDED" && this.isEditable){
        		this.isEditable = false;
        	}
        	
        	if(this.objectData.students){
	        	this.parentRequests = this.objectData.students;
	        	this.hasParentRequest = this.commonService.hasParentRequests(this.parentRequests);

				for (var i = 0; i < this.objectData.students.length; i++) {
					this.addRequest(this.objectData.students[i]);
				}
			}			
			// console.log('parentRequests requestlist comp', this.parentRequests);
	    }
	}

	// Function for request component
	addRequest(jsonData:any) {
		// console.log('addRequest',jsonData);
		if(jsonData && _.has(jsonData, 'requestId')){
		  (<FormArray>this.tnFormRequest.controls.students).push(this.getRequestGroup(jsonData));
		}else{
		  (<FormArray>this.tnFormRequest.controls.students).push(this.getRequestGroup(null));
		}
	}
	getRequestGroup(jsonData:any){
		// console.log('getRequestGroup',jsonData);
		if(jsonData && _.has(jsonData, 'requestId')){
		  return this._fb.group({
		    requestId: [jsonData.requestId, [<any>Validators.required]],
		    isSelected: [false, []]
		  });
		}
	}
	updateRequest(){
		// console.log(event.target, event.target.checked);
		let requestControl = <FormArray>this.tnFormRequest.controls.students;
		this.selectedRequests = [];

		for (var i = 0; i < requestControl.controls.length; i++) {
		  if(requestControl.controls[i].get("isSelected").value){
		    this.selectedRequests.push(this.objectData.students[i]);
		  }
		}
	}

	acceptRequest(acceptReject) {
		this.updateRequest();
		if(this.selectedRequests.length > 0){
			this.errorMsg = "";
			if(this.checkCTA('accept',this.selectedRequests)){
				//console.log("this.selectedRequests",this.selectedRequests);
				let paymentnotSetup = 0;
				let parentNames = [];
				if(this.selectedRequests){
					for(var i=0; i<this.selectedRequests.length; i++){
						if((this.selectedRequests[i] && this.selectedRequests[i].parent && !this.selectedRequests[i].parent.paymentSetupVerified)){
							paymentnotSetup++;
							let name = this.namePipe.transform(this.selectedRequests[i].student.name, this.selectedRequests[i].student.fname, this.selectedRequests[i].student.lname)
							parentNames.push(name);
						}
					}
				}
				if(paymentnotSetup==0){
					this.errorMsg = "";
					this.saveForm.emit({model:{students: this.selectedRequests, isAccept: true}, isValid: true, form: "tnRequestAcceptRejectForm"});
					// console.log('acceptRequest',this.tnFormRequest.value,this.selectedRequests);
				}else{
					this.errorMsg = this.translate.transform('err_payment_not_setup');
					this.errorMsg = _.replace(this.errorMsg,"{{STUDENT_NAMES}}",parentNames.join(', '));
				}			
			}
		}else{
			this.errorMsg = this.translate.transform('err_selectparent_for_accept');
		}
	}
	updateHostDetail() {
		this.updateRequest();
		this.errorMsg = "";
		// console.log('updateHostDetail this.selectedRequests',this.selectedRequests);
		if(this.selectedRequests.length == 1){
			let formname = "tnHostDetail";
			if(this.parentComponent=='operations'){
				formname = "tnChangeHostDetail";
			}

			if(this.checkCTA('mark_as_host',this.selectedRequests)){
				// if(! (this.selectedRequests[0] && this.selectedRequests[0].parent && this.objectData.hostId && (this.selectedRequests[0].parent._id == this.objectData.hostId._id || this.selectedRequests[0].student._id == this.objectData.studentHostId._id) )){
				if(! (this.selectedRequests[0] && this.selectedRequests[0].parent && this.objectData.hostId && this.selectedRequests[0].parent._id == this.objectData.hostId._id )){
					this.saveHostDetail.emit({model: {"isMakeMeHost": false, 'hostId':this.selectedRequests[0].parent._id, 'studentHostId':this.selectedRequests[0].student._id, makeMeHost: false}, isValid: true, form: formname});
				}else{
					this.errorMsg = this.translate.transform('err_select_newone_parent_to_host');
					let parentname = this.namePipe.transform(this.selectedRequests[0].parent.name, this.selectedRequests[0].parent.fname, this.selectedRequests[0].parent.lname);
					this.errorMsg = _.replace(this.errorMsg,"{{PARENTNAME}}",parentname);
				}
			}
		}else {		
			// alert("Please select any one request or parent to mark as host.");
			this.errorMsg = this.translate.transform('err_select_one_parent_for_mark_as_host');
		}
	}
	dropRequest(event,acceptReject) {
		this.updateRequest();
		this.errorMsg = "";

		if(this.userViewMode == 'PARENT'){
			if(this.selectedRequests.length > 0){
				if(this.checkCTA('drop',this.selectedRequests)){
					// Now will enable disable tooltip for this.
					this.dropInlinePopupEnabled = true;

					this.inlinePopupPosition = 'bottom-right';
					this.inlineViewMode = 'drop-confirm';
					this.triggeringPoint = event;
					this.inlinePopupEnabled = true;
					// console.log(this.dropInlinePopupEnabled, this.inlinePopupEnabled, this.inlineViewMode);
				}
				// TODO: POPUP NEED TO INTEGRATED
				// this.saveForm.emit({model:{students: this.selectedRequests, isAccept: false}, isValid: true, form: "tnRequestAcceptRejectForm"});
			}else{
				this.errorMsg = this.translate.transform('err_selectparent_own_for_decline');
			}
		}else{
			if(this.selectedRequests.length > 0){
				// console.log('dropRequest',this.tnFormRequest.value,this.selectedRequests);
				if(this.checkCTA('drop',this.selectedRequests)){
					// Please confirm that you like to drop <Student1 first name> from this Talantnook.
					let student_list = this.getStudentStatusString(this.selectedRequests,true);
					let translatedErrMsg = this.translate.transform('student_list_cta_drop_msg');
					this.deleteConfirmMessage = _.replace(translatedErrMsg,"{{student_list}}",student_list);
					console.log(this.deleteConfirmMessage);
					
					this.dropInlinePopupEnabled = true;

					this.inlinePopupPosition = 'bottom-right';
					this.inlineViewMode = 'drop-confirm';
					this.triggeringPoint = event;
					this.inlinePopupEnabled = true;
				}

				// TODO: POPUP NEED TO INTEGRATED
				// this.showConfirm = true;
				// this.actionType = 'decline';
			}else{
				// Show error message
				this.errorMsg = this.translate.transform('err_selectparent_for_decline');
			}
		}
	}
	dropConfirm(flag){
		if(flag){
			this.saveForm.emit({model:{students: this.selectedRequests, isAccept: false}, isValid: true, form: "tnRequestAcceptRejectForm"});
		}
		this.dropInlinePopupEnabled = false;
		this.inlinePopupEnabled = false;
	}

	checkCTA(type:any='', selectedRequests:any=false){
		// console.log('checkCTA', type, this.selectedRequests);
		if(_.indexOf(['drop','accept','mark_as_host'],type)!=-1) {
			let requestArray = selectedRequests;
			let compareStatus = ["NOACTION"];		
			let comparePositiveStatus = ["NOACTION"];

			switch (type) {
				case "drop":
					compareStatus = ["DROPPED","ACCEPTED","REQUESTED","WAITLISTED"];
					comparePositiveStatus = ["DROPPED"];
					break;
				case "accept":
					compareStatus = ["ACCEPTED","DROPPED","REQUESTED","WAITLISTED"];
					comparePositiveStatus = ["ACCEPTED"];
					break;
				case "mark_as_host":
					compareStatus = ["ACCEPTED"];
					break;
			}

			if(requestArray && requestArray.length>0){
				let negativeRequests = [];
				let positiveRequests = [];

				for (var i = requestArray.length - 1; i >= 0; i--) {
					if(this.userViewMode == 'PARENT'){
						if(requestArray[i].parent._id == this.userContainer.user._id && _.indexOf(compareStatus,requestArray[i].currentStatus)==-1){
							negativeRequests.push(requestArray[i]);
						}
						if(requestArray[i].parent._id == this.userContainer.user._id && _.indexOf(comparePositiveStatus,requestArray[i].currentStatus)>=0){
							positiveRequests.push(requestArray[i]);
						}
					}else{
						if(_.indexOf(compareStatus,requestArray[i].currentStatus)==-1){
							negativeRequests.push(requestArray[i]);
						}
						if(_.indexOf(comparePositiveStatus,requestArray[i].currentStatus)>=0){
							positiveRequests.push(requestArray[i]);
						}
					}
				}
				// console.log('negativeRequests',negativeRequests);

				let status = false;

				if(positiveRequests.length>0){
					let translatedErrMsg = this.translate.transform('multiple_student_list_cta');
					if(type=='drop'){
						translatedErrMsg = _.replace(translatedErrMsg,"{{status_list}}",'deleted');
					}else if(type=='accept'){
						translatedErrMsg = _.replace(translatedErrMsg,"{{status_list}}",'accepted');
					}
					translatedErrMsg = _.replace(translatedErrMsg,"{{cta}}",type);
					this.errorMsg = translatedErrMsg;
				}else{				
					if(negativeRequests.length==0) {
						this.errorMsg = "";
						status = true;
					}else if(negativeRequests.length==1) {
						// Add the student name and current status to requested CTA
						let translatedErrMsg = this.translate.transform('single_student_list_cta_notinvited');
						let currentStatus = _.lowerCase(negativeRequests[0].currentStatus);
						switch (type) {
							case "drop":
							case "accept":
								if(negativeRequests[0].currentStatus!='INVITED'){
									translatedErrMsg = _.replace(translatedErrMsg,"{{student_first_name}}",negativeRequests[0].student.fname);
								}else{
									translatedErrMsg = this.translate.transform('single_student_list_cta_invited');
									let tmp = (negativeRequests[0].parentemail)? negativeRequests[0].parentemail : "";
									translatedErrMsg = _.replace(translatedErrMsg,"{{student_first_name}}",tmp);
								}
								translatedErrMsg = _.replace(translatedErrMsg,"{{status1}}",currentStatus);
								translatedErrMsg = _.replace(translatedErrMsg,"{{cta}}",type);
								translatedErrMsg = _.replace(translatedErrMsg,"{{status2}}",currentStatus);

								this.errorMsg = translatedErrMsg;
								break;
							case "mark_as_host":
								// console.log('negativeRequests.student', currentStatus, negativeRequests[0]);
								if(negativeRequests[0].currentStatus!='INVITED'){
									translatedErrMsg = _.replace(translatedErrMsg,"{{student_first_name}}",negativeRequests[0].student.fname);
								}else{
									translatedErrMsg = this.translate.transform('single_student_list_cta_invited');
									let tmp = (negativeRequests[0].parentemail)? negativeRequests[0].parentemail : "";
									translatedErrMsg = _.replace(translatedErrMsg,"{{student_first_name}}",tmp);
								}
								translatedErrMsg = _.replace(translatedErrMsg,"{{status1}}",currentStatus);
								translatedErrMsg = _.replace(translatedErrMsg,"{{cta}}",'mark as host');
								translatedErrMsg = _.replace(translatedErrMsg,"{{status2}}",currentStatus);

								this.errorMsg = translatedErrMsg;
								break;
						}
					}else if(negativeRequests.length>1) {
						let translatedErrMsg = this.translate.transform('multiple_student_list_cta');
						let translatedErrMsgMarkHost = this.translate.transform('multiple_student_list_markhost');
						let statusString = this.getStudentStatusString(negativeRequests);

						switch (type) {
							case "drop":
							case "accept":
								// Selected students are from invited and accepted status. You can not accept these student.
								// Selected students are from {{status_list}} status. You can not {{cta}} these student.
								translatedErrMsg = _.replace(translatedErrMsg,"{{status_list}}",statusString);
								translatedErrMsg = _.replace(translatedErrMsg,"{{cta}}",type);
								this.errorMsg = translatedErrMsg;
								break;
							case "mark_as_host":
								// translatedErrMsg = _.replace(translatedErrMsg,"{{status_list}}",statusString);
								// translatedErrMsg = _.replace(translatedErrMsg,"{{cta}}",'mark as host');
								this.errorMsg = translatedErrMsgMarkHost;
								break;
						}
					}
				}
				return status;
			}else{
				return false;
			}
		}else{
			return false;
		}
	}
	getStudentStatusString(requestList:any=[],getName:boolean=false){
		let statusArray = [];
		let statusString = "";
		for (var i = 0; i < requestList.length; i++) {
			if(getName){
				// IF want to get student name
				statusArray.push(requestList[i].student.fname);
			}else{
				// IF want to get student status
				statusArray.push(requestList[i].currentStatus);
			}
		}
		statusArray = _.uniq(statusArray);
		for (var i = 0; i < statusArray.length; i++) {
			if(i>0 && i==statusArray.length-1){
				statusString+=" and "+_.lowerCase(statusArray[i]);
			}else{
				statusString+=(statusString=="")? _.lowerCase(statusArray[i]) : ", "+_.lowerCase(statusArray[i]);
			}
		}
		return statusString;
	}

	// FOR VIEW FILE ONLY
	isParentCanDrop(selectedRequests:any=false){
		let requestArray = []
		if(selectedRequests && selectedRequests.length>0){
			requestArray = selectedRequests;
			if(requestArray && requestArray.length>0){
				let negativeRequests = [];
				for (var i = requestArray.length - 1; i >= 0; i--) {
					if(requestArray[i].parent && this.userContainer.user && requestArray[i].parent._id == this.userContainer.user._id && _.indexOf(["ACCEPTED","REQUESTED"],requestArray[i].currentStatus)!=-1){
						return true;
					}
				}
			}
			return false;
		}else{
			return false;
		}
	}
	parentCanDrop(selectedRequest:any=false){
		if(selectedRequest){
			if(selectedRequest.parent && this.userContainer.user && selectedRequest.parent._id == this.userContainer.user._id && _.indexOf(["ACCEPTED","REQUESTED"],selectedRequest.currentStatus)!=-1){
				return true;
			}
			return false;
		}else{
			return false;
		}
	}
	// FOR VIEW FILE ONLY

	/*acceptDecline(flag){
		if(flag){
			this.actionType = 'accept';
			this.yesButton = this.yesButton1;
			this.confirmTitle = this.acceptCnfTitle;
			this.confirmContent = this.acceptCnfContent;
		}else{
			this.actionType = 'decline';
			this.yesButton = this.yesButton2;
			this.confirmTitle = this.declineCnfTitle;
			this.confirmContent = this.declineCnfContent;
		}
		this.showConfirm = true;
	}*/
	confirmOutput(response){
		this.showConfirm = false;
		this.errorMsg = "";
		if(response.response){
			/*if(this.actionType=='accept'){
				this.sentAcceptDeclineRequest(true);
			}else{
				this.sentAcceptDeclineRequest(false);
			}*/
			this.saveForm.emit({model:{students: this.selectedRequests, isAccept: false}, isValid: true, form: "tnRequestAcceptRejectForm"});
		}
	}
	

	returnedScheduleData(event){
		// {model:this.tmFormSchedule.get('schedule').value,'isFlexible':this.isFlexible, 'selectedRequestForSchedule': this.totalRequestsIndexValues}
		console.log('returnedScheduleData event',event);
		if(!event.isCancel){
			// TODO:
			// save this schedule in actual schedule
			event.form = 'tnPickedSchedule';
			event.isValid = true;
			event.hasNewScheduleData = false;
			// console.log(event.selectedRequestForSchedule);
			if(event.model || (this.scheduleCom.hasData(true) && this.scheduleCom.isDirty() && this.scheduleCom.isValidForm())){
				event.hasSchedule = true;
			}

			if(this.scheduleCom.isValidForm() && this.scheduleCom.hasData(true)){
				let that = this;
				let modelObject = _.transform(this.scheduleCom.getModelData(), function(result, value, key) {
			        // result["tm."+key] = value;
			        result[key] = that.profileService.convertFormat(value);
			    }, {});
			    console.log('returnedScheduleData modelObject', modelObject, event);
			    // this.requestForm.get('requestedSchedule').setValue(modelObject);
			    event.hasNewScheduleData = true;
			    event.model = modelObject;

			    this.saveForm.emit(event);
				this.pickScheduleEnabled = false;
				this.inlinePopupEnabled = false;
			}else if(this.scheduleCom.hasPickedData()){
				this.saveForm.emit(event);
				this.pickScheduleEnabled = false;
				this.inlinePopupEnabled = false;
			}
		}else{
			this.pickScheduleEnabled = false;
			this.inlinePopupEnabled = false;
		}
	}
	inviteStudent() {
		let inviteData = {showInvite: true, isStudentInvite: true, studentInviteData: {fromUser: this.user._id, lessonId: this.objectData._id, isGrandfathering: this.objectData.isGrandfathering, userViewMode: this.userViewMode}};
		// console.log("inviteStudent inviteData", inviteData);
		this.notifyService.notifyInvitationChanges(inviteData);
	}

	save(model: any, isValid: boolean, form:String) {
		this.submitted = true;
		if(isValid){
		  // console.log(model,isValid,form)
		  this.saveForm.emit({model:this.selectedRequests, isValid: true, form: "tnFormRequest"});
		}
	}

	getModelData(){
		return {"selectedRequests": this.selectedRequests };
	}

	editSchedule(event, request){
		// let tmpdata = {schedule: _.clone(request.requestedSchedule)};
		// this.dataToEditSchedule = _.clone(tmpdata);
		this.dataToEditSchedule = {schedule:_.clone(request.requestedSchedule)};
		this.currentRequestToEditSchedule = _.clone(request);

		console.log('editSchedule requestedSchedule dataToEditSchedule tmpdata', request.requestedSchedule, this.dataToEditSchedule);
		this.enableScheduleEditing = true;
		
		this.inlinePopupPosition = 'bottom-left';
		this.inlineViewMode = 'edit-schedule';
		this.triggeringPoint = event;
		this.inlinePopupEnabled = true;
	}
	showHidePickSchedule(event){
		// this.pickScheduleEnabled = !this.pickScheduleEnabled;
		this.pickScheduleEnabled = true;

		this.inlinePopupPosition = 'bottom-left';
		this.inlineViewMode = 'pick-schedule';
		this.triggeringPoint = event;
		this.inlinePopupEnabled = true;
	}
	openPickSchedule(){
		var w = jQuery(window);
		let pos = jQuery("#pick_a_schedule").offset();
		let event = {target: jQuery("#pick_a_schedule"), clientX: (pos.left-w.scrollLeft())+50, clientY: (pos.top-w.scrollTop()) };
		// console.log(this.pickScheduleButton, jQuery("#pick_a_schedule"), event);
		this.showHidePickSchedule(event);
	}

	returnEditScheduleData(event){
		// console.log('returnEditScheduleData',event);
		if(event && event.isCancel){
			this.inlinePopupEnabled = false;
			this.dataToEditSchedule = {schedule: []};

			// this.enableScheduleEditing = false;
		}else{
			// Save edited schedule
			this.inlinePopupEnabled = false;
			// console.log('returnEditScheduleData', event.form, event.isValid, event.model);
			if(event.isValid){
				let that = this;
				let modelObject = _.transform(event.model, function(result, value, key) {
			        // result["tm."+key] = value;
			        result[key] = that.profileService.convertFormat(value);
			    }, {});
			    // event.hasNewScheduleData = true;
			    // event.model = modelObject;
			    console.log('tnUpdateSchedule modelObject', modelObject);
				this.saveForm.emit({model:{requestSchedule: modelObject, requestId: this.currentRequestToEditSchedule.requestId}, isValid: true, form: "tnUpdateSchedule"});
			}
		}
	}

	onHide(event){
		console.log('onHide',event);
		this.inlinePopupEnabled = false;
		
		this.dropInlinePopupEnabled = false;
		this.enableScheduleEditing = false;
		this.pickScheduleEnabled = false;
	}
	hasData(scheduleData: any = []){
		let returnVal = false;
		_.forEach(scheduleData, function(value) {
			if(value.length>0){
			  returnVal = true;
			}
		});
		return returnVal;
	}
}
