import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { Router, ActivatedRoute } from '@angular/router';
import { FormGroup, FormArray, FormControl, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from 'ng2-translate';
import { CookieService } from 'ng2-cookies';
import { environment } from '../../../environments/environment';

import { AuthService } from '../../common/auth.service';
import { CommonService } from '../../common/common.service';
import { NotifyService } from '../../common/notify.service';
import { ProfileService } from '../../profile/profile.service';
import { UserService } from '../../user/user.service';
import { TalentService } from '../../profile/talent/talent.service';
import { LessonService } from '../lesson.service';

import { FormatSchedule } from '../../pipes/format-schedule';
import { FormatTimeSchedule } from '../../pipes/format-time-schedule';
import { urlValidator, numberValidator, rangeValidator, timerangeValidator, floatnumberValidator } from '../../validators/custom-validation';

import _ from 'lodash';
declare var jQuery:any;

@Component({
  selector: 'app-request',
  templateUrl: './request.component.html',
  styleUrls: ['./request.component.css'],
  providers: [ProfileService, UserService, TranslatePipe, FormatSchedule, FormatTimeSchedule, TalentService, LessonService, CookieService]
})

export class RequestComponent implements OnInit {
	@ViewChild('scheduleCom') scheduleCom;

	public tmprofile: any;
	public user: any;
	public talentnook: any;
	public talents: any;
	public showMyTnLink: boolean = false;
	public isJoinRequest: boolean = false;
	public isWaitlist: boolean = false;
	public isLaunched: boolean = false;
	public availableSlot: number = 0;
	public contentLoaded: boolean = false;
	public requestForm: any;
	private objectId: any;
	private requestId: any;
	private sub: any;

	public isEditable: boolean = true;
	public isSingleForm: boolean = true;
	public scheduleEdit: boolean = true;
	public scheduleData: any = [];
	public feesEdit: boolean = false;
	public feesData: any = {};
	public studentsData: any = [];
	public existsStudentsData: any = [];
	public host_the_talentnook_at_your_home: any = "";
	public click_here_if_your_child_is_existing_student: any = "";
	public showScheduleErr: boolean = false;
	public showStudentErr: boolean = false;
	public showTalentErr: boolean = false;
	public submitted: boolean = false;

	public parentRequests: any = [];
	public hasParentRequest: boolean = false;
	public selectedScheduleRequest: any = null;
	public renderChild: boolean = false;
	public isGrandfathering: boolean = false;

  	constructor(
  		public profileService: ProfileService,
	    public userService: UserService,
	  	public commonService: CommonService,
	  	public router: Router,
	    public route: ActivatedRoute,
	    public authService: AuthService,
	    public notifyService: NotifyService,
	    public talentService: TalentService,
	    public tnService: LessonService,
	    private _fb: FormBuilder,
	    private _elementRef : ElementRef,
	    private _sanitizer: DomSanitizer,
	    private translate: TranslatePipe,
	    public cookieService: CookieService,
  	) { 
  		this.host_the_talentnook_at_your_home = this.translate.transform("host_the_lesson_at_your_home");  		
  	}

  	ngOnInit() {
  		this.contentLoaded = false;
  		this.user = this.authService.loadUser();
  		this.requestForm = this._fb.group({});

  		this.sub = this.route.params.subscribe(params => {
  			this.objectId = params['objectId'];
  			this.requestId = params['requestId'];

  			if(this.router.url.toLowerCase().indexOf("request")!=-1){
  				this.fetchUserProfile();	  				
  			}else{
  				this.isJoinRequest = true;
  				this.fetchTalentRequest();	  				
  			}
  		});
  	}

  	ngAfterViewInit(){
  		this.renderChild = true;

  		// CLEAR THE REDIRECT COOKIE SO THAT USER WILL NOT REDIRECTED ON NEXT LOGIN
  		this.cookieService.set('afterLoginRedirect', "");
  		this.cookieService.set('afterLoginAndSignupStepRedirect', "");
  	}
  	
  	ngOnDestroy() {
	    if(this.sub){
	    	this.sub.unsubscribe();
	    }
	}

	initForm(){
		// console.log('initForm',this.isWaitlist);
		if(!this.isWaitlist){
			this.requestForm = this._fb.group({
				_id: ['', []],
				requestId: ['', []],
				isJoinRequest: [this.isJoinRequest, []],
				teacher: ['', [<any>Validators.required]],
				parent: ['', [<any>Validators.required]],
				talent: ['', [<any>Validators.required]],
				comment: ['', []],
				isFlexible: [false, []],
				isGrandfathering: [false, []],
				isWaitlist: [this.isWaitlist, []],
				parentWillingToHost: [false, []],
				requestedSchedule: [{}, [<any>Validators.required]],
				students: this._fb.array([])
			});
		}else{
			this.requestForm = this._fb.group({
				_id: ['', []],
				requestId: ['', []],
				isJoinRequest: [true, []],
				teacher: ['', [<any>Validators.required]],
				parent: ['', [<any>Validators.required]],
				talent: ['', []],
				comment: ['', []],
				isFlexible: [false, []],
				isGrandfathering: [false, []],
				isWaitlist: [this.isWaitlist, []],
				parentWillingToHost: [false, []],
				requestedSchedule: [{}, []],
				students: this._fb.array([])
			});
		}
  	}

  	loadTalents() {
	    this.talentService.getTalents().subscribe(data => {
	      if (data.error == 0) {
	        if (data.talents.length) {
	          let talents = [];
	          data.talents.forEach((v, k) => {
	            talents.push(v.talent)
	          })
	          this.talents = talents;
	          // console.log('this.talents',this.talents);
	        }
	      }
	    },
	    err => {
	      this.router.navigate(['/']);
	    });
	}

	initTalents(talents: any){
		let list = [];
		for (var i = talents.length - 1; i >= 0; i--) {
			if(talents[i] && talents[i].talent && talents[i].talent){
				list.push(talents[i].talent);
			}
		}
		this.talents = list;
		if(this.talents.length == 1){
			this.requestForm.get("talent").setValue(this.talents[0]);
		}
		console.log('this.talents',this.talents);
	}

	fetchUserProfile() : any {
	    this.commonService.notifyFlashMsgChanges({isLoading:1});
	    this.profileService.getProfileById(this.objectId).subscribe( jsonData => {
			// console.log('jsonData',jsonData);
	      	
	      	this.isWaitlist = false;
	      	this.isLaunched = false;
	      	this.isJoinRequest = false;
	      	this.initForm();
	      	
	      	if(jsonData && jsonData.error==0 && jsonData.user){
				this.tmprofile = jsonData.user;
				this.setTeacher(this.tmprofile._id);
		      	this.setParent(this.user._id);
		      	this.requestForm.get('requestId').setValue(this.requestId);

		      	if(this.tmprofile.tm && this.tmprofile.tm.skills){
		      		this.initTalents(this.tmprofile.tm.skills);
		      	}

				// this.setupUserData(profile);
				this.commonService.notifyFlashMsgChanges({isLoading:0});
				this.contentLoaded = true;
	      	}else{
				this.router.navigate(['/']);
	      	}
	    },
	    err => {
			this.commonService.notifyFlashMsgChanges({isLoading:0});
			this.router.navigate(['/']);
	    });
	}

	fetchTalentRequest() : any {
		this.commonService.notifyFlashMsgChanges({isLoading:1});

		this.tnService.getDetail(this.objectId).subscribe(jsonData => {
			this.commonService.notifyFlashMsgChanges({isLoading:0});
			if(jsonData.error==0){
				if(jsonData.lesson){
					this.talentnook = jsonData.lesson;
					this.tmprofile = jsonData.lesson.tmId;
					this.feesData = jsonData.lesson;
					this.parentRequests = jsonData.lesson.students;

					// this.isGrandfathering = (jsonData.lesson.isGrandfathering)? jsonData.lesson.isGrandfathering : false;
					this.isGrandfathering = this.checkForGrandfathering();

					this.hasParentRequest = this.commonService.hasParentRequests(this.parentRequests);

					this.isWaitlist = false;
			      	this.isJoinRequest = true;

					/*if(this.talentnook.availableSlot >= this.talentnook.studentPerSession){
						this.isWaitlist = true;
						this.requestForm.get('_id').setValue(this.talentnook._id);
						this.requestForm.get('isWaitlist').setValue(true);
					}*/


					// TODO: need to consider in view if availableSlot less than zero then need to show zero always.
					this.availableSlot = (this.talentnook.availableSlot >0) ? this.talentnook.availableSlot : 0;
					if(this.talentnook.status=='ACTIVE'){
						// this.isWaitlist = true; // There is only one criteria that it will be defined by available slots.
						this.isLaunched = true; // There is only one criteria that it will be defined by available slots.
					}else if(this.talentnook.status!='REQUESTED' && this.talentnook.status!='ACKNOWLEDGED'){
						this.router.navigate(['/unauthorized']);
					}
					// TODO: Need to finalize the isWaitlist or not.
					if(this.availableSlot<=0){
						// There is only one criteria that it will be defined by available slots.
						this.isWaitlist = true;
					}
					

					this.initForm();
					if(this.tmprofile.tm && this.tmprofile.tm.skills){
			      		this.initTalents(this.tmprofile.tm.skills);
			      	}
					// Set talentnook id
					this.requestForm.get('_id').setValue(this.talentnook._id);
					this.requestForm.get('talent').setValue(this.talentnook.talent);
					this.requestForm.get('requestId').setValue(this.requestId);
	      			this.setParent(this.user._id);
					this.setTeacher(this.tmprofile._id);
					if(this.tmprofile.fname){
						let tmpname = this.translate.transform("click_here_if_your_child_is_existing_student");
						this.click_here_if_your_child_is_existing_student = _.replace(tmpname,"{{TMNAME}}",this.tmprofile.fname);
					}
					this.filterAlreadyExistsStudents(this.talentnook);
					if(this.isWaitlist){
						this.requestForm.get('isWaitlist').setValue(true);
					}
				}else{
					this.router.navigate(['/unauthorized']);
				}
				this.contentLoaded = true;
			}else{
				this.initForm();
				this.contentLoaded = true;
				this.router.navigate(['/unauthorized']);
			}
		}, err => {
	    	this.commonService.notifyFlashMsgChanges({isLoading:0});
	      	this.router.navigate(['/404']);
	    });
	}

	checkForGrandfathering(requestId:any=''){
		let isGF = false;
		console.log("checkForGrandfathering 2 ", this.requestId, this.talentnook.isGrandfathering, this.talentnook.students, this.talentnook.students.length);
		if(this.talentnook && this.talentnook.isGrandfathering && this.requestId && !_.isEmpty(this.requestId) && this.talentnook.students && this.talentnook.students.length >0){
			for (var i = this.talentnook.students.length - 1; i >= 0; i--) {
				console.log("checkForGrandfathering", this.requestId, this.talentnook.students[i]);
				if(this.talentnook.students[i].requestId == this.requestId && this.talentnook.students[i].isGrandfatheringInvite){
					isGF = true;
				}
			}
		}
		return isGF;
	}

	hasScheduleData(){
	    let returnVal = false;
	    if(this.talentnook && this.talentnook.schedule){
		    _.forEach(this.talentnook.schedule, function(value) {
		        if(value.length>0){
		        	returnVal = true;
		        }
		    });
	    }
	    return returnVal;
	}

	autocompleListFormatter = (data: any) : SafeHtml => {
	    let html = `<span>${data}</span>`;
	    return this._sanitizer.bypassSecurityTrustHtml(html);
	}

	setParent(id) { 
		this.requestForm.get('parent').setValue(id);
	}
	setTeacher(id) { 
		this.requestForm.get('teacher').setValue(id);
	}
	filterAlreadyExistsStudents(talentnook){
		this.existsStudentsData = [];
		if(talentnook && talentnook.students){
			for (var i = 0; i < talentnook.students.length; i++) {
				if(	talentnook.students[i].parent && 
					talentnook.students[i].parent._id && 
					talentnook.students[i].student && 
					talentnook.students[i].student._id &&
					talentnook.students[i].parent._id == this.user._id
				){
					this.existsStudentsData.push(talentnook.students[i].student._id);
				}
			}
		}
		this.filterStudentForm();
	}

	// Students AND EXPERIENCE
	addStudents(event:any,jsonData:any) { 
		// console.log('jsonData getStudentsGroup ',jsonData);
		if(event){ event.preventDefault(); }
		if(jsonData && _.has(jsonData, '_id')){
		  	(<FormArray>this.requestForm.controls.students).push(this.getStudentsGroup(jsonData));
		}else{
		  	(<FormArray>this.requestForm.controls.students).push(this.getStudentsGroup(null));
		}
	}
	getStudentsGroup(jsonData:any){
		if(jsonData && _.has(jsonData, '_id')){
		  	return this._fb.group({
			    _id: [jsonData._id, [<any>Validators.required]],
			    isJoined: [jsonData.isJoined, []],
			    isAlreadyJoined: [false, []],
			    full: [jsonData.full, []],
			    fname: [jsonData.fname, []],
			    lname: [jsonData.lname, []],
		  	});
		}else{
		  	return this._fb.group({
			    _id: ['', [<any>Validators.required]],
			    parentId: ['', []],
			    isJoined: [false, []],
			    isAlreadyJoined: [false, []],
			    full: ['', []],
			    fname: ['', []],
			    lname: ['', []],
		  	});
		}
	}
	removeStudents(index) { 
		const control = <FormArray>this.requestForm.controls['students'];
		control.removeAt(index);
	}

	updateStudentData(){
		let students = this.studentsData;
		for (var i = 0; i < this.studentsData.length; i++) {
			this.addStudents(null,this.studentsData[i]);
		}
		this.filterStudentForm();
	}

	checkForStudents(){
		let students = <FormArray>this.requestForm.controls.students;
		let selectedCount = 0;
		for (var i = students.controls.length - 1; i >= 0; i--) {
			if(students.controls[i].get('isJoined').value){
				selectedCount++;
			}
		}
		return (selectedCount>0)? true : false;
	}

	checkForTalents(){
		let talentval = this.requestForm.get("talent").value;
		if(!_.isEmpty(talentval)){
			let matched = false;
			for (var i = this.talents.length - 1; i >= 0; i--) {
				if(_.toLower(this.talents[i]) == _.toLower(talentval)){
					matched = true;
				}
			}
			return matched;
		}else{
			return false;
		}
	}
	
	filterStudentForm(){
		if(this.existsStudentsData && this.existsStudentsData.length >0){
			let students = <FormArray>this.requestForm.controls.students;
			for (var i = 0; i < students.controls.length ; i++) {
				if(_.indexOf(this.existsStudentsData, students.controls[i].get('_id').value)!=-1){
					students.controls[i].get('isAlreadyJoined').setValue(true);
				}
			}
		}
	}
	studentExists(id){
		let students = <FormArray>this.requestForm.controls.students;
		for (var i = students.controls.length - 1; i >= 0; i--) {
			if(students.controls[i].get('_id').value==id){
				return true;
			}
		}
		return false;
	}

	showHideStudentError(){
		this.showStudentErr = !(this.checkForStudents());
	}

	sendRequest(isValid){
		this.submitted = true;
		this.showScheduleErr = false;
		this.showStudentErr = false;
		this.showTalentErr = false;
		let selectedScheduleData = null;		
		// console.log('this.selectedScheduleRequest',this.scheduleCom.isValidForm(),this.scheduleCom.hasData(true), this.hasSelectedScheduleRequest());

		// if(!this.isLaunched && !this.requestForm.get('isFlexible').value){
		if(!this.isLaunched){ // We need to take schedule in both conditions
			this.fetchScheduleData();
			// console.log('this.selectedScheduleRequest', this.selectedScheduleRequest, this.hasSelectedScheduleRequest(), this.scheduleCom.hasData(true), this.scheduleCom.isValidForm());
			if(!_.isNull(this.selectedScheduleRequest) && !_.isEmpty(this.selectedScheduleRequest)){
	    		if(this.hasSelectedScheduleRequest()){
	    			selectedScheduleData = {"schedule": this.selectedScheduleRequest};
	    		}else{ 
	    			if(! (this.scheduleCom.isValidForm() && this.scheduleCom.hasData(true))){
						this.showScheduleErr = true;
					}
	    		}
	    	}else{
				if(! (this.scheduleCom.isValidForm() && this.scheduleCom.hasData(true))){
					this.showScheduleErr = true;
				}
	    	}
		}

		if(!this.checkForStudents()){
			this.showStudentErr = true;
		}

		if(this.requestForm.get('talent').valid && !this.isLaunched){
			if(!this.checkForTalents()){
				this.requestForm.get('talent').setErrors({'mismatchTalent' : true});
				this.showTalentErr = true;
			}else{
				this.showTalentErr = false;
				this.requestForm.get('talent').setErrors(null);
			}
		}

		console.log('sendRequest', this.requestForm.value, isValid, this.showScheduleErr, this.showStudentErr, this.requestForm.get('isFlexible').value);
		if(isValid && !this.showScheduleErr && !this.showStudentErr && !this.showTalentErr){
			// if(!this.isLaunched && !this.requestForm.get('isFlexible').value){
			if(!this.isLaunched){ // We need to take schedule in both conditions
				if(this.selectedScheduleRequest && this.hasSelectedScheduleRequest()){
	    			this.requestForm.get('requestedSchedule').setValue(selectedScheduleData);
	    			this.showScheduleErr = false;
	    		} else{
					if(this.scheduleCom.isValidForm() && this.scheduleCom.hasData(true)){
						let that = this;
						let modelObject = _.transform(this.scheduleCom.getModelData(), function(result, value, key) {
					        // result["tm."+key] = value;
					        result[key] = that.profileService.convertFormat(value);
					    }, {});
					    // console.log('modelObject',modelObject);
					    // this.requestForm.get('requestedSchedule').setValue(this.scheduleCom.getModelData());
					    this.requestForm.get('requestedSchedule').setValue(modelObject);
					    this.showScheduleErr = false;
					}
	    		}
			}else{
				this.requestForm.get('requestedSchedule').setValue({});
			}

			console.log('Save data',this.requestForm.value, this.requestForm.valid, this.showScheduleErr);		
			this.commonService.notifyFlashMsgChanges({isLoading:1});
		    this.tnService.tnRequest(this.requestForm.value).subscribe( jsonData => {
		    	// console.log('jsonData request',jsonData);
				if(jsonData.error==0 && jsonData.data && jsonData.data._id){
					this.commonService.notifyFlashMsgChanges({isLoading:0});
					this.contentLoaded = true;
					
					let time = Date.now() + ((3600 * 1000) * 24); // 24 hours from current time;
    				if(this.isWaitlist){
    					this.cookieService.set('header_msgfor_launch_page', "PARENT_JOIN_REQUEST", time);
    				}else{
    					this.cookieService.set('header_msgfor_launch_page', "PARENT_NEW_REQUEST", time);
    				}
					this.router.navigate(['/lesson/launch/'+jsonData.data._id]);
				}
		    }, err => {
		      	this.commonService.notifyFlashMsgChanges({isLoading:0});
		      	this.router.navigate(['/']);
		    });
		}else{
			this.commonService.getFormValidationErrors(this.requestForm);
		}
	}

	saveScheduleDetail(event){
	    this.scheduleEdit = true;
	    console.log('saveScheduleDetail',event);
	    // this.save(event.model,event.isValid,event.form);
	}

	returnStudentData(event){
	    // console.log('returnStudentData',event);	    
	    for (var i = event.model.length - 1; i >= 0; i--) {
			if(!this.studentExists(event.model[i]._id)){
				this.addStudents(null,event.model[i]);
			}
		}
	    // _.merge(this.studentsData, event.model);
	    this.updateStudentData();
	}

	fetchScheduleData(){
		let event = this.scheduleCom.getScheduleData();
		this.selectedScheduleRequest = null;
		this.requestForm.get('isFlexible').setValue(false);

		if(this.requestForm && this.requestForm.get('isFlexible')){
	    	this.requestForm.get('isFlexible').setValue(event.isFlexible);
	    	this.selectedScheduleRequest = event.selectedRequestForSchedule;	    	
	    }
	    // console.log('eventevent',this.selectedScheduleRequest,this.requestForm.get('isFlexible').value, this.requestForm.get('isFlexible'));
	}

	returnScheduleData(event){
	    // console.log('returnScheduleData',event);
	    if(this.contentLoaded && this.requestForm && this.requestForm.get('isFlexible')){
	    	this.selectedScheduleRequest = null;
	    	this.requestForm.get('isFlexible').setValue(event.isFlexible);
	    	this.selectedScheduleRequest = event.selectedRequestForSchedule;
	    }
	}

	hasSelectedScheduleRequest(){
		let hasdata = false;
		_.each(this.selectedScheduleRequest, function(values, key){
			if(values.length>0){
				hasdata = true;
			}
		});
		return hasdata;
	}

	onProfileImageError(event){
	    this.commonService.setDefaultProfileImage(event);
	}

	getProfileImage(imageName:any,userId:any){
	    return this.commonService.getProfileImage(imageName,userId,false);
	}
}
