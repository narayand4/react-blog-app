import { Component, OnInit, Output, Input, ViewChild, EventEmitter, SimpleChange, ElementRef } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { FormGroup, FormArray, FormControl, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TranslatePipe } from 'ng2-translate';
import { environment } from '../../../../environments/environment';

import { ProfileService } from '../../../profile/profile.service';
import { AuthService } from '../../../common/auth.service';
import { CommonService } from '../../../common/common.service';
import { NotifyService } from '../../../common/notify.service';
import { LessonService } from '../../lesson.service';

import { FormatSchedule } from '../../../pipes/format-schedule';
import { FormatTimeSchedule } from '../../../pipes/format-time-schedule';
import { NamePipe } from '../../../pipes/name';
import { urlValidator, numberValidator, rangeValidator, timerangeValidator, floatnumberValidator } from '../../../validators/custom-validation';

declare var jQuery:any;
import _ from 'lodash';
import * as moment from 'moment';

@Component({
  selector: 'app-session',
  templateUrl: './session.component.html',
  styleUrls: ['./session.component.css'],
  providers: [FormatSchedule, FormatTimeSchedule, TranslatePipe, NamePipe, LessonService, ProfileService, DatePipe]
})

export class SessionComponent implements OnInit {
	@ViewChild('lesson_inline_popup') inlinePopup:ElementRef;

	@Input('objectData')
	objectData: any = {};

	@Input('lessonEdit')
	lessonEdit: boolean = false;

	@Input('isEditable')
	isEditable: boolean = false;

	@Input('isSingleForm')
	isSingleForm: boolean = false;

	@Input('userViewMode')
	userViewMode: string = ''; // 'PARENT' and 'TM'

	@Input('parentComponent')
	parentComponent: string = 'lesson'; // 'launch' and nothin when will be used as main component

	@Output('save')
	saveForm: EventEmitter<any> = new EventEmitter<any>();
	

	public errorMsg: string = "";
	public env: any = environment;
	public lessonData: any = [];
	public lessonDataList: any = [];

  	protected subUrl: any;
  	protected subParam: any;
  	protected talentNookId: any = null;
  	protected talentnook: any = null;
  	protected user: any;
  	protected showLessonForm: boolean = false;
  	protected dateTime: any;
  	protected date: any;
  	protected startTime: any;
  	protected endTime: any;

  	protected inlineViewMode: String = '';	// addnote, listnote
  	public inlinePopupEnabled: boolean = false;

  	public requestStatusForm: FormGroup;
  	public tnFormLessonSchedule: FormGroup;
  	public tnFormNote: FormGroup;
  	public saveNoteSubmit: boolean = false;
  	public saveLessonSumitted: boolean = false;
  	public noteList: any = [];
  	public triggeringPoint: ElementRef = null;
	public currentFilter: any = {}; // Default will list all the lessons
	public talentMaster: any; // Default will list all the lessons
	public cancelModelData: any = {};
	public a2eOptionsdate = {format: 'YYYY-MM-DD',ignoreReadonly: true, allowInputToggle: true, useCurrent: true, minDate: new Date(), defaultDate: new Date()};
	public a2eOptionsTime = {format: 'LT',ignoreReadonly: true, allowInputToggle: true, useCurrent: true, defaultDate: new Date()};

	constructor(
		public profileService: ProfileService,
		public commonService: CommonService,
		public authService: AuthService,
		private notifyService: NotifyService,
		private translate: TranslatePipe,
		private lessonService: LessonService,
		private namePipe: NamePipe,
		private router: Router,
		private route: ActivatedRoute,
		private _fb: FormBuilder,
		private elementRef: ElementRef,
		private datePipe: DatePipe,
	) { }

	ngOnInit() {
		this.user = this.authService.loadUser();
		
		this.subUrl = this.router.events.subscribe((event:any) => { 
	    	if (event instanceof NavigationEnd){
	    		if(event.url.includes("sessions")){
	    			this.parentComponent = "";
	    		}
	    	}
	    });

		this.subParam = this.route.params.subscribe(params => {
	        this.talentNookId = params['objectId'];
	        if(this.parentComponent!='operations'){
		        if (this.talentNookId) {
		          	this.updateLessonData();
		        }
			}
	    });

		this.initForm();

		//---- Status Boxes
		this.requestStatusForm = this._fb.group({
            statusBoxes: this._fb.array([])
        });
  		this.addStatus('show_all',true);
  		this.addStatus('futurelesson');
  		this.addStatus('scheduled');
  		this.addStatus('cancelled');
  		this.addStatus('completed');
  		this.addStatus('done');
	}

	ngOnDestroy() {
	    if(this.subUrl){
	      this.subUrl.unsubscribe();
	    }
	}

	ngOnChanges(changes: {[propName: string]: SimpleChange}) {
		// console.log('changes',changes);
		if(changes['lessonEdit'] !== undefined){
		  	this.lessonEdit = changes['lessonEdit'].currentValue;
		}

		if(changes['objectData'] !== undefined){
		  	this.objectData = changes['objectData'].currentValue;
		  	if(this.objectData._id){
				this.talentNookId = this.objectData._id;
				this.updateLessonData();
			}
		}

		if(changes['userViewMode'] !== undefined){
		  	this.userViewMode = changes['userViewMode'].currentValue;
		  	console.log('this.userViewMode',this.userViewMode);
		}

		if(changes['isEditable'] !== undefined){
		  	this.isEditable = changes['isEditable'].currentValue;
		}
	}
	
	initForm(){
		/*this.tnFormLessonSchedule = this._fb.group({
			dateTime: ['', [<any>Validators.required]]
		});*/
		this.tnFormLessonSchedule = this._fb.group({
			date: ['', [<any>Validators.required]],
			startTime: ['', [<any>Validators.required]],
			endTime: ['', [<any>Validators.required]],
		});
		this.tnFormNote = this._fb.group({
			note: ['', [<any>Validators.required]],
			_id: ['', [<any>Validators.required]],
		});
		this.saveNoteSubmit = false;
		this.saveLessonSumitted = false;
	}

	getPostParams(modal:any=''){
		if(this.parentComponent=='operations'){
			return { tnId:this.talentNookId, modal: modal, notstatus: "FUTURELESSON", rows: 3}; 
		}else{
			return { tnId:this.talentNookId }; 
		}
	}

	updateLessonData(){
		console.log('userViewMode: ',this.userViewMode, this.parentComponent);

		this.commonService.notifyFlashMsgChanges({isLoading:1})
		let params = this.getPostParams();

		this.lessonService.getSessions(params).subscribe(jsonData => {
			this.lessonData = jsonData.data;
			this.lessonDataList = this.lessonData;

			if(this.lessonData && this.lessonData[0] && this.lessonData[0].tnId){
				console.log('updateLessonData', this.lessonData[0].tnId, this.user._id);
				
				this.talentnook = this.lessonData[0].tnId;
				// WHEN THIS IS BEING USED IN OPERATION PAGE THEN NO NEED TO UPDATE THIS.
				if(this.parentComponent!='operations'){
					if(this.talentnook.tmId && this.talentnook.tmId == this.user._id){
						this.userViewMode = 'TM';
					}else{
						this.userViewMode = 'PARENT';
					}
				}

				//Get TM
				if(this.talentnook.tmId){
					this.profileService.getProfileById( this.talentnook.tmId ).subscribe( jsonData => {
						this.talentMaster = jsonData.user;
						console.log('this.talentMaster',this.talentMaster);						
				    },
				    err => {
						console.log('error on get getProfileById');
				    });
				}
			}else{
				console.log('updateLessonData no lesson found');
				// WHEN THIS IS BEING USED IN OPERATION PAGE THEN NO NEED TO UPDATE THIS.
				if(this.parentComponent!='operations'){
					this.userViewMode = 'PARENT';
				}
			}

			if(this.lessonData && this.objectData && this.objectData.status){
				if(this.parentComponent==''){
					// TODO: in future we can have some restriction.
				}
			}else{
				// TODO: REDIRECT ON THE UNAUTHERIZED PAGE.
				// console.log('Talentnook lauch page expired');
				// this.router.navigate(['/unauthorized']);						
			}
			this.commonService.notifyFlashMsgChanges({isLoading:0});
		},err =>{
			this.commonService.notifyFlashMsgChanges({isLoading:0});
		});
	}

	addLesson(event){
		if(!this.hasValidStudents()){
			jQuery('#student-error-popup').modal('show');
		}else{
			this.initForm();
			// this.inlinePopupEnabled = false;
			this.showLessonForm = true;

			this.triggeringPoint = event;
			this.inlineViewMode = 'addlesson';
			this.inlinePopupEnabled = true;
		}
	}
	isValidForm(){
		let hasError = true;
	    let startDate = this.tnFormLessonSchedule.get('date').value;
	    let startT = this.tnFormLessonSchedule.get('startTime').value;
        let endT = this.tnFormLessonSchedule.get('endTime').value;

        let startD, mintime, maxtime, mintimeData, maxtimeData;

        startD = (startDate && startDate._isAMomentObject)? startDate.format('YYYY-MM-DD') : startDate;
        mintimeData = (startT && startT._isAMomentObject)? startT.format('HH:mm') : startT;
        mintime = (startT && startT._isAMomentObject)? startT.format('HHmm') : startT;
        maxtimeData = (endT && endT._isAMomentObject)? endT.format('HH:mm') : endT;
        maxtime = (endT && endT._isAMomentObject)? endT.format('HHmm') : endT;
        
        // console.log('isValidForm', (mintime!=""), (maxtime!=""), (mintime < maxtime));
	    console.log('lesson isValidForm 1 ', _.clone(this.tnFormLessonSchedule.value), _.clone(this.tnFormLessonSchedule.valid), _.clone(this.tnFormLessonSchedule.errors));
        if(!(mintime!="" && maxtime!="" && (mintime < maxtime))){
        	console.log("error 1");
        	this.tnFormLessonSchedule.setErrors({invalidTime:true});
        	hasError = false;
        }else if(! (startD!="")){
          	console.log("error 2");
          	this.tnFormLessonSchedule.setErrors({invalidDate:true});
          	hasError = false;
        }
	    console.log('lesson isValidForm 2 ', _.clone(this.tnFormLessonSchedule.value), _.clone(this.tnFormLessonSchedule.valid), _.clone(this.tnFormLessonSchedule.errors));
	    
	    this.tnFormLessonSchedule.get('date').setValue(startD);
	    this.tnFormLessonSchedule.get('startTime').setValue(mintimeData);
	    this.tnFormLessonSchedule.get('endTime').setValue(maxtimeData);
	    // console.log('isValidForm', _.clone(this.tnFormLessonSchedule.value), this.tnFormLessonSchedule.valid, hasError);
	    // return this.tnFormLessonSchedule.valid;
	    return hasError;
	}
	saveLesson(modal, isValid){
		this.saveLessonSumitted = true;
		// if(isValid){
		let formValid = this.isValidForm();
		if(formValid){
			console.log('saveLesson this.tnFormLessonSchedule.value', this.tnFormLessonSchedule.value);

			let startDate = this.tnFormLessonSchedule.get('date').value;
		    let startT = this.tnFormLessonSchedule.get('startTime').value;
	        let endT = this.tnFormLessonSchedule.get('endTime').value;
	        let startD, mintimeData, maxtimeData;
	        
	        startD = (startDate && startDate._isAMomentObject)? startDate.format('YYYY-MM-DD') : startDate;
	        mintimeData = (startT && startT._isAMomentObject)? startT.format('HH:mm') : startT;
	        maxtimeData = (endT && endT._isAMomentObject)? endT.format('HH:mm') : endT;
	        let modalData = {date: startD, startTime: mintimeData, endTime: maxtimeData};

			let params = this.getPostParams();
			params['modal'] = modalData;

			this.commonService.notifyFlashMsgChanges({isLoading:1});
			this.lessonService.addLesson(params).subscribe(jsonData => {
				this.lessonData = jsonData.data;
				// console.log('this.lessonData',this.lessonData);

				this.showLessonForm = false;
				this.inlinePopupEnabled = false;
				this.tnFormLessonSchedule.reset();
				this.initForm();
				
				this.commonService.notifyFlashMsgChanges({isLoading:0});
				this.saveLessonSumitted = false;
			},err =>{
				this.saveLessonSumitted = false;
				this.commonService.notifyFlashMsgChanges({isLoading:0});
			});
		}
	}
	saveNote(modal, isValid){
		this.saveNoteSubmit = true;
		if(isValid){
			console.log('this.tnFormNote.value', this.tnFormNote.value);
			let params = this.getPostParams(modal);

			this.commonService.notifyFlashMsgChanges({isLoading:1})
			this.lessonService.addNote(params).subscribe(jsonData => {
				this.lessonData = jsonData.data;
				// console.log('this.lessonData',this.lessonData);

				this.showLessonForm = false;
				this.inlinePopupEnabled = false;
				// this.inlinePopupEnabled = false;
				this.initForm();
				this.commonService.notifyFlashMsgChanges({isLoading:0});
				this.saveNoteSubmit = false;
			},err =>{
				this.saveNoteSubmit = false;
				this.commonService.notifyFlashMsgChanges({isLoading:0});
			});
		}
	}

	updateStatus(event, action, sessionId){
		if(!_.isEmpty(action) && !_.isEmpty(sessionId)){
			let success = false;
			let studentsId = this.getAllSelectedStudents(sessionId);			
			this.cancelModelData = {form:'tnFormUpdateStatus', updatedStatus:action, _id: sessionId, studentsList: studentsId};

			if(action == 'mark_as_complete' && studentsId){
				if(studentsId.length > 0){
					success = true;
					this._updateLessonStatus();
				}else{
					// TODO: show warning to select one of student.
				}
			}else if(action == 'cancel'){
				success = true;
				this.inlineViewMode = 'cancelLesson';

				this.triggeringPoint = event;
				this.inlinePopupEnabled = true;
			}			
		}
	}
	getAllSelectedStudents(sessionId){
		// let allcheckboxes = this.elementRef.nativeElement.querySelectorAll("input[name=students_"+sessionId+"]");
		let allCheckedCheckboxes = this.elementRef.nativeElement.querySelectorAll("input[name=students_"+sessionId+"]:checked");
		// console.log('allcheckboxes',allcheckboxes); 
		// console.log('allCheckedCheckboxes',allCheckedCheckboxes);

		let studentIds = [];
		for (var i = allCheckedCheckboxes.length - 1; i >= 0; i--) {
			studentIds.push(allCheckedCheckboxes[i].value);
		}
		return studentIds;
	}
	completeCancelConfirm(flag){
		if(flag){
			this._updateLessonStatus();
		}else{
			this.inlineViewMode = '';
			this.inlinePopupEnabled = false;
		}
	}
	_updateLessonStatus(){
		let modal = this.cancelModelData; // {form:'tnFormUpdateStatus', updatedStatus:action, _id: sessionId, studentsList: studentsId};
		let modaldata = this.getPostParams(modal);

		this.commonService.notifyFlashMsgChanges({isLoading:1})
		this.lessonService.updateNoteStatus(modaldata).subscribe(jsonData => {
			this.lessonData = jsonData.data;
			console.log('this.lessonData',this.lessonData);

			this.showLessonForm = false;
			this.inlineViewMode = '';
			this.inlinePopupEnabled = false;
			this.initForm();
			this.commonService.notifyFlashMsgChanges({isLoading:0});
		},err =>{
			this.inlineViewMode = '';
			this.inlinePopupEnabled = false;
			this.commonService.notifyFlashMsgChanges({isLoading:0});
		});
	}

	testingclick(){
		console.log('testingclick');
		// this.inlinePopupEnabled = !this.inlinePopupEnabled;
	}
	closeAddShowNote(){
		console.log('closeAddShowNote',this.inlineViewMode);
	}
	showNote(event,actinofor,notesData){
		this.inlinePopupEnabled = false;
		// console.log('event,actinofor,notesData', event,actinofor,notesData);
		if(event.target && !_.isEmpty(actinofor)){
			this.triggeringPoint = event;
			// inlineViewMode

			this.noteList = [];
			if(actinofor=='shownote'){
				// TODO: show tm notes conditionally if admin logged in then show adminotes instead on tm notes
				this.inlineViewMode = 'listnote';
				this.noteList = notesData;

				this.triggeringPoint = event;
				this.inlinePopupEnabled = true;
				// console.log('actinofor',this.inlineViewMode);
			}else if(actinofor=='showtmnote'){
				// TODO: show tm notes this will be used if admin user looking this page.
				this.inlineViewMode = 'listnote';
				this.noteList = notesData;

				this.triggeringPoint = event;
				this.inlinePopupEnabled = true;
			}
		}
	}

	addNote(event,sessionId){
		this.inlinePopupEnabled = false;
		if(event.target && !_.isEmpty(sessionId)){
			this.initForm();
			// TODO: Add note
			this.inlineViewMode = 'addnote';
			this.tnFormNote.get('_id').setValue(sessionId);

			this.triggeringPoint = event;
			this.inlinePopupEnabled = true;
			// console.log('event,this.inlinePopup', event,this.inlinePopup);
			// console.log('getPosition', this.setInlinePopup(event.target));
		}
	}

	onHide(event){
		// console.log('onHide',event);
		this.inlinePopupEnabled = false;
		this.saveNoteSubmit = false;
		this.saveLessonSumitted = false;
		// this.inlinePopupEnabled = event.modal.showInlinePopup;
	}

	setInlinePopup( el ) {
	    var x = 0;
	    var y = 0;
	    var leftpos = 0;
	    var toppos = 0;
	    var tmpel = el;
	    while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
		    x += el.offsetLeft - el.scrollLeft;
		    y += el.offsetTop - el.scrollTop;

		    leftpos = el.offsetLeft;
		    toppos = el.offsetTop;

		    // console.log('el.offsetLeft - el.scrollLeft', el.offsetLeft , el.scrollLeft);
		    // console.log('el.offsetTop - el.scrollTop', el.offsetTop , el.scrollTop);

		    el = el.offsetParent;
	    }

	    var topPos = tmpel.getBoundingClientRect().top + window.scrollY;
		var leftPos = tmpel.getBoundingClientRect().left + window.scrollX;

		var tp = tmpel.offsetLeft - (window.scrollY || window.pageYOffset || document.body.scrollTop);
		var lft = tmpel.offsetTop - (window.scrollX || window.pageXOffset || document.body.scrollLeft);

	    // let temp = this.elementRef.nativeElement.querySelector('#lesson-inline-popup');
	    // this.inlinePopup
	    var lftpos = x - 100;
	    this.inlinePopup.nativeElement.style.lftpos = x+'px';
	    this.inlinePopup.nativeElement.style.top = y+'px';
	    this.inlinePopup.nativeElement.style.position = 'fixed';
	    // console.log('this.inlinePopup.nativeElement', this.inlinePopup, this.inlinePopup.nativeElement);
	    
	    // this.inlinePopup.nativeElement.removeClass('hide');
	    // this.inlinePopup.nativeElement.addClass('show');
	    this.inlinePopup.nativeElement.classList.remove("hide");
	    this.inlinePopup.nativeElement.classList.add("show");

	    console.log('this.inlinePopup.nativeElement.style', leftPos, topPos, this.inlinePopup.nativeElement.style.left, this.inlinePopup.nativeElement.style.top);

	    // this.inlinePopup.nativeElement.style.left = leftpos+'px';
	    // this.inlinePopup.nativeElement.style.top = toppos+'px';
	    // console.log('this.inlinePopup.nativeElement.style', this.inlinePopup.nativeElement.style.left, this.inlinePopup.nativeElement.style.top);

	    return { top: y, left: x };
	}

	// Filter Grid
	addStatus(statusName:any,value: boolean = false) {
	    (<FormArray>this.requestStatusForm.controls.statusBoxes).push(this.getStatusGroup(statusName,value));
	}
	
	getStatusGroup(statusName:any,value: boolean = false){
	    return this._fb.group({
	    	statusName: [statusName, []],
	        isSelected: [value, []]
	    });
	}
	
	updateFilterStatus(event,statusName){
	    let requestControl = <FormArray>this.requestStatusForm.controls.statusBoxes;
	    let selectedStatusSchedule = null;
	    this.currentFilter = [];
	    let filters = [];

	    for (var i = 0; i < requestControl.controls.length; i++) {
	      if(requestControl.controls[i].get("statusName").value == statusName && event.target.checked){
	        requestControl.controls[i].get("isSelected").setValue(true);
	        filters = _.union(filters, this.getFilter(statusName));
	      }else{
	        requestControl.controls[i].get("isSelected").setValue(false);
	      }
	    }
	    
	    this.currentFilter = filters;
	    this.lessonDataList = [];
	    this.refreshList();
	}

	getFilter(statusName){
		let filter = [];
		switch (statusName) {
			case "done":
				filter = ['DONE'];
			break;
			case "completed":
				filter = ['COMPLETED'];
			break;
			case "cancelled":
				filter = ['CANCELLED'];
			break;
			case "scheduled":
			case "futurelesson":
				filter = ['SCHEDULED','FUTURELESSON'];
			break;
			case "show_all":
			default:
				filter = [];
			break;
		}
		return filter;
	}

	refreshList(){
		let filteredList = [];
		if(this.currentFilter.length > 0){
			for (var i = 0; i < this.lessonData.length; i++) {
				if(_.indexOf(this.currentFilter, this.lessonData[i].status) >=0 ){
					filteredList.push(this.lessonData[i]);
				}
			}
			this.lessonDataList = filteredList;
		}else{
			this.lessonDataList = this.lessonData;
		}
	}

	showLessonDate(date){
		let startDate = moment(date).format("DD/MM/YYYY");
		let currentDate = moment(new Date()).format("DD/MM/YYYY");
		if(currentDate == startDate){
			return "Today "+moment(date).format("h:mm A")
		}else{
			return this.datePipe.transform(date, this.env.DATE_FORMAT);
			// return moment(date).format(this.env.DATE_FORMAT);
		}
	}

	hasValidStudents(){
		let returnval = false;
		if(this.talentnook && this.talentnook.students && this.talentnook.students.length>0){
			for (var i = this.talentnook.students.length - 1; i >= 0; i--) {
				if(this.talentnook.students[i].status=='ACCEPTED'){
					returnval = true;
					break;
				}
			}
		}
		return returnval;
	}
}
