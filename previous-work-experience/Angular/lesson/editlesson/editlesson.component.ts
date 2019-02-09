import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { BrowserModule, DomSanitizer} from '@angular/platform-browser';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { FormGroup, FormArray, FormControl, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from 'ng2-translate';
import { CookieService } from 'ng2-cookies';
import { environment } from '../../../environments/environment';

import { AuthService } from '../../common/auth.service';
import { CommonService } from '../../common/common.service';
import { NotifyService } from '../../common/notify.service';
import { ProfileService } from '../../profile/profile.service';

import { LessonService } from '../lesson.service';
import { FormatSchedule } from '../../pipes/format-schedule';
import { FormatTimeSchedule } from '../../pipes/format-time-schedule';

import { phoneValidator, numberValidator, emailValidator, rangeValidator, zipValidator } from '../../validators/custom-validation';

declare var jQuery:any;
import _ from 'lodash';

@Component({
	selector: 'app-editlesson',
	templateUrl: './editlesson.component.html',
	styleUrls: ['./editlesson.component.css', '../createlesson/createlesson.component.css'],
	providers: [LessonService, ProfileService, FormatSchedule, TranslatePipe, FormatTimeSchedule]
})
export class EditlessonComponent implements OnInit {
	@ViewChild('tmFormLessonDetailForm') tmFormLessonDetailForm;
    @ViewChild('tmOutlineCom') tmOutlineCom;
    @ViewChild('tmFormFeesCom') tmFormFeesCom;
    @ViewChild('managetalentCom') managetalentCom;
    @ViewChild('scheduleCom') scheduleCom;
    @ViewChild('policyCom') policyCom;
    @ViewChild('tmFormFeesPopupCom') tmFormFeesPopupCom;

	public env = environment;
	public breadcrumbData: any = [{linkurl:'/mylessons',label:'My lessons'}, {linkurl:'',label:'Lesson detail'}];

	public sub : any;
	public user: any = {};
	public lesson: any = {};
	public tmInitialData: any = {};
	public hostData: any = {};
	// public currentUrl: string = '';
	// public currentActiveTab: string = '';
	public isGrandfathering: boolean = false;
	public editId: any = '';
	public gridViewMode: any = '';
	public dataLoaded: boolean = false;
	public hintsPopup: boolean = true;


	public tmFormLessonDetail: FormGroup; // our model driven form
	public submitted: boolean = false;
	public isEditable: boolean = false;
	public isSingleForm: boolean = false;
    public talentNotAdded: boolean = false;
    public currentSection: string = 'detail';
    public studentWarning: boolean = false;

    public feesEdit: boolean = true;
    public feesEditGrid: boolean = false;
    public scheduleEdit: boolean = true;

    public policyEdit: boolean = false;
    public lessonOutlineEdit: boolean = false;

    public taughtLevelList = ['Beginner', 'Intermediate', 'Advanced'];
	public backgroundImg: any = '';
    
    public isEditablePopup: boolean = true;
    public isSingleFormPopup: boolean = false;
    public scheduleEditPopup: boolean = true;
    public lessonDetailEditPopup: boolean = true;
    public feesEditPopup: boolean = true;

    protected inlineViewMode: String = '';	// edit-schedule, pick-schedule
  	public inlinePopupEnabled: boolean = false;
  	public inlinePopupPosition: string = 'bottom-left';
  	public triggeringPoint: any;
  	public enableScheduleEditing: boolean = false;
  	public enableSessionEditing: boolean = false;
  	public enableFeesEditing: boolean = false;
  	public dataToEditSchedule: any = {schedule: []};
  	public currentRequestToEditSchedule: any = {};
  	public deleteConfirmMessage: any = "";

  	public tooltipTriggeringPoint: any = "";
  	public startUpload: boolean = false;
  	public uploadImageSize: boolean = false;
  	public showCircleThumb: any = false;
  	public imageSettings: any = {croppedWidth: 197, croppedHeight: 100, width: 197, height: 100};

  	public gradeList: any = [];
  	public ageList: any = [];
  	
  	public nameError: boolean = false;
  	public taughtLevelSuggestion: boolean = false;

  	public buggyComponent: any = [];
  	public scrollSection: any = '';

	constructor(
		public authService: AuthService,
	    public commonService: CommonService,
	    public lessonService: LessonService,
	    public notifyService: NotifyService,
	    public profileService: ProfileService,
	    public router: Router,
	    private route: ActivatedRoute,
	  	public cookieService: CookieService,
	    private translate: TranslatePipe,
	    private _fb: FormBuilder,
	    private sanitizer:DomSanitizer
	    // private timeAgoPipe: TimeAgoPipe,
	) { }

	ngOnInit() {
		this.gradeList = this.commonService.getGradeList();
        this.ageList = this.commonService.getAgeList();

		this.user = this.authService.loadUser();
		this.initForm();

		// let imgPath = this.env.BASE_URL+'assets/images/stepprofile/148X90_7c8795c7-da71-4ae5-b2e3-a6dfa88e694b.jpeg';
		// let imgPath = this.env.BASE_URL+'storage/talents/148X90_7c8795c7-da71-4ae5-b2e3-a6dfa88e694b.jpeg';
		// let imgPath = this.env.BASE_URL+'storage/categories/148X90_6e32e3a6-5fda-49fd-9560-b190bf0d596e.jpeg';
		// this.backgroundImg = this.sanitizer.bypassSecurityTrustStyle('url(http://www.freephotos.se/images/photos_medium/white-flower-4.jpg)');
		// this.backgroundImg = this.sanitizer.bypassSecurityTrustStyle('url('+imgPath+')');

  		this.sub = this.route.params.subscribe(params => {
  			this.user = this.authService.loadUser();
  			if(params['lessonId'] && !_.isEmpty(params['lessonId'])){
  				this.editId = params['lessonId'];
  				this.fetchLessonData();
  			}else{
  				// Else redirect on my lesssons;
  				this.router.navigate(['/mylessons']);
  			}
  		});
	}

	ngAfterViewInit(){
		let self = this;
		jQuery("#alert-pop").on("hidden.bs.modal", function () {
			if(self.scrollSection!=""){
				// setTimeout(function(){ self.commonService.scrollToComponent(self.scrollSection, 'requestlist-container', function(){ self.requestlistCom.openPickSchedule(); }); }, 300);
				setTimeout(function(){ self.commonService.scrollToComponent(self.scrollSection, '', function(){ }); }, 300);
			}
		});
	}

	ngOnDestroy() {
      	if(this.sub){
          	this.sub.unsubscribe();
      	}
    }

    initForm(){
        let formObjects = {};

        formObjects = {
	        _id: ['', [<any>Validators.required]],
	        name: ['', [<any>Validators.required, <any>Validators.maxLength(40)]],
	        taughtLevel: this._fb.array([]), // Beginner, intermediate, advance
	        grade: [''],
	        age: [''],
	        // studentPerSession: ['', [<any>Validators.required, <any>rangeValidator.validRange(1,20)]],
	        // minStudentPerSession: ['', [<any>Validators.required, <any>rangeValidator.validRange(1,20)]],
	        // sessionDuration: ['', [<any>Validators.required, <any>numberValidator.validNumber, <any>rangeValidator.validRange(1,480)]],
	        // isFreeTrial: ['', [<any>Validators.required]],
	        // experience: ['', [<any>Validators.required]],
	        // sessionOutline: ['', [<any>Validators.required]],
	    };

    	this.tmFormLessonDetail = this._fb.group(formObjects);
    }

    updateFormData(talentData:any=null){
        this.tmFormLessonDetail.patchValue({
            _id: (talentData._id)? talentData._id : "",
            name: (talentData.name)? talentData.name : "",
            grade: (talentData.grade)? talentData.grade : "",
            age: (talentData.age)? talentData.age : "",
            // studentPerSession: (talentData.studentPerSession)? talentData.studentPerSession : "",
            // minStudentPerSession: (talentData.minStudentPerSession)? talentData.minStudentPerSession : "",
            // sessionDuration: (talentData.sessionDuration)? talentData.sessionDuration : "",
            // isFreeTrial: (talentData.isFreeTrial)? talentData.isFreeTrial : "No",
            // experience: (talentData.experience)? talentData.experience : "",
            // sessionOutline: (talentData.sessionOutline)? talentData.sessionOutline : "",
        });

        // To notify the fees section so that fees component and it's value would be updated accordingly.
        // this.notifyService.notifyLessonDetailChanges({numberOfStudent: ( (talentData.studentPerSession)? talentData.studentPerSession : 0) });
        
        // console.log("talentData.talent", talentData.talent, this.tmFormLessonDetail.value);
        if(talentData.taughtLevel){
            for (var i = talentData.taughtLevel.length - 1; i >= 0; i--) {
                this.addLevelsTaughts(null,talentData.taughtLevel[i]);
            }
        }
    }
    saveDetail(modal,isvalid,form){
    	// Nothing to do with this submit
    }
    hasLevelTaught(levelName){
        let control = <FormArray>this.tmFormLessonDetail.controls.taughtLevel;
        let tmparr = control.value;
        if(_.indexOf(tmparr,levelName) > -1){
            return true;
        }
        return false;
    }
    updateTaughtLevel(event,level){
        let control = <FormArray>this.tmFormLessonDetail.controls.taughtLevel;
        let temp: any = control.value;

        if(event.target.checked){
            this.addLevelsTaughts(null,event.target.value);
        }else{
            // remove
            this.removeLevelsTaughts(event.target.value);
        }
    }
    addLevelsTaughts (event:any, data:any) {
        if(event){ event.preventDefault(); }
        if(data && !_.isEmpty(data)){
            (<FormArray>this.tmFormLessonDetail.controls.taughtLevel).push(this.getLevelsTaughtGroup(data));
        }else{
            (<FormArray>this.tmFormLessonDetail.controls.taughtLevel).push(this.getLevelsTaughtGroup(null));
        }
    }
    getLevelsTaughtGroup(data:any){
        if(data && !_.isEmpty(data)){
            return this._fb.control(data,[<any>Validators.required])
        }else{
            return this._fb.control('',[<any>Validators.required])
        }
    }
    removeLevelsTaughts (val) {
        let control = <FormArray>this.tmFormLessonDetail.controls.taughtLevel;
        let tmparr = control.value;

        for (var i = tmparr.length - 1; i >= 0; i--) {
            if(tmparr[i]==val){
                control.removeAt(i);
            }
        }
    }


    fetchLessonData(){
    	if(this.editId && !_.isEmpty(this.editId)){
			this.commonService.notifyFlashMsgChanges({isLoading:1});

			this.lessonService.getDetail(this.editId).subscribe(data => {
				this.commonService.notifyFlashMsgChanges({isLoading:0});
				// console.log('fetchLessonData'); // ,data.lesson,this.user
				if(this.user && !_.isEmpty(this.user._id) && (data.lesson && data.lesson.tmId && data.lesson.tmId._id) && data.lesson.tmId._id == this.user._id){
			        if(data.lesson && data.lesson.status.toUpperCase()=="DRAFT"){
			        	this.isEditable = true;
		      		}
			        this.gridViewMode = "tm";
			        
			        this.lesson = data.lesson;
			        this.isGrandfathering = (data.lesson.isGrandfathering)? data.lesson.isGrandfathering : false;
			        // this.lessonData = data.sessionData;
			        console.log(this.lesson.status, this.lesson.status.toUpperCase());

			        // NOW EDITING WILL BE ENABLED ONLY ON DRAFT TN
			        /*if(this.lesson.status && this.lesson.status.toUpperCase()=='ACTIVE'){
			        	this.setSingleForm(false);
			        }else{
			        	this.setSingleForm(true);
			        }*/

			        // NOW EDITING WILL BE ENABLED ONLY ON DRAFT OR NEW TN
			        /*if(_.isEmpty(this.lesson.status) || this.lesson.status.toUpperCase()=='DRAFT'){
			        	this.setSingleForm(true);
			        }else{
			        	this.setSingleForm(false);
			        }*/

					this.tmInitialData = this.lesson.tmId;
					this.user = this.lesson.tmId;				

					this.hostData = this.lesson.hostId;
					this.updateFormData(this.lesson);
					
					// To update the count for the lesson views.
					// this.updateViewCount(this.lesson._id); // This will be applicable only on the view page.

					this.dataLoaded = true;
		      	}else{
		      		if(!(this.user && this.authService.isAdmin(this.user))) {
	      				this.router.navigate(['/unauthorized']);
			          	// this.router.navigate(['/404']);
			        }
			        this.dataLoaded = true;

		      		this.isEditable = false;
		      		this.gridViewMode = "user";
		      	}
			}, err => {
		    	this.commonService.notifyFlashMsgChanges({isLoading:0});
		      	this.router.navigate(['/404']);
		    });
		}else{
			this.router.navigate(['/404']);
		}
	}

	saveLessonOutlineDetail(event){
  		console.log("saveLessonOutlineDetail",event);
	    this.lessonOutlineEdit = true;
	    this.save(event.model,event.isValid,event.form);
	}
	savePolicyDetail(event){
  		console.log("savePolicyDetail",event);
	    this.policyEdit = true;
	    this.user.tm.policy = event.model["policy"];
	    this.save(event.model,event.isValid,event.form);
	}

	/*saveScheduleDetail(event){
  		console.log("saveScheduleDetail",event);
	    this.scheduleEdit = true;
	    this.save(event.model,event.isValid,event.form);
	}
	*/

	saveFeesDetail(event){
  		console.log("saveFeesDetail",event);
  		this.onHideTooltip(null);
  		this.feesEdit = true;

    	if(!event.isCancel){
		    this.feesEdit = true;
		    if(event.isValid){
		    	this.user.tm.fees = event.model.fees;
		    	this.save(event.model,event.isValid,event.form);
		    }
    	}else{
    		this.feesEdit = false;
    	}
	}	

	saveLessonDetail(event){
  		console.log("saveLessonDetail",event);
  		this.onHideTooltip(null);

		if(event && event.isCancel){
			// Nothing to do preivously doing some operations.
		}else{
			// Save edited lessson detail
			if(event.isValid){
			    console.log('saveLessonDetail modelObject', event.model);
			    this.save(event.model,event.isValid,event.form);
			}
		}
	    
	}

	// TO SAVE THE FORMS DATA
	save(model: any, isValid: boolean, form:String) {
		this.submitted = true; 
	    // set form submit to true

		if(this.isSingleForm || this.gridViewMode=='user'){ return false; }	    

	    // this.getFormValidationErrors();
	    switch (form) {
	      case "tmFormFees": 
	      case "tmFormLessonOutline":
	      case "tmFormLessonDetail":
	      case "tmFormPolicy":
	      case "tmFormSchedule":
	        if(isValid){
	          // this.saveTnProfile(this.user.tm, 'DRAFT');
	          let status = "DRAFT";
	          if(this.lesson._id && !_.isEmpty(this.lesson._id)){
	          	status = this.lesson.status;
	          }
	          this.saveTnProfile(model, form, status);
	        }
	        break;
	    }
	}

	saveTnProfile(model, formName, status, showLoading:boolean=true) : any {
		model.formName = formName;
		model._id = (this.lesson._id)? this.lesson._id : "";

		console.log('saveTnProfile', model, status, this.user.tm.editId);
		
		if(showLoading){
			this.commonService.notifyFlashMsgChanges({isLoading:1});
		}

	    this.lessonService.saveTnProfile(model).subscribe(jsonData => {
	    	this.commonService.notifyFlashMsgChanges({isLoading:0});
	    	if(jsonData.error==0 && jsonData.data){
		      	if((formName.toLowerCase().indexOf('launch')!=-1) || (formName.toLowerCase().indexOf('launchLater')!=-1) || (formName.toLowerCase().indexOf('cancel')!=-1)){
		      		this.router.navigate(['/mylessons']);
		      	}else{
			    	this.lesson = jsonData.data;
			      	this.updateFormData(this.lesson);
			      	this.resetAllForms();
		      	}
	    	}else{
	    		console.log(this.translate.transform('error_on_lesson_save'), jsonData.msg);
	    	}
	    }, err => {   
	    	/*if(!this.isSingleForm){ 
	      		this.resetAllForms();
	      	}*/   
	      	this.resetAllForms();
	      	this.commonService.notifyFlashMsgChanges({isLoading:0});
	    });
	    
	}

	updateOnChange($event, type, showLoading:boolean=false, status:any){
		let saveData = false;
		// let defaultModal = {image: event.model.image, name:event.name, action:'uplaodLessonImage', lessonId:this.lesson._id};
		let defaultModal = {action:'nameTalentGradeAgeStatus', lessonId:this.lesson._id};
		let model = {};
		this.nameError = false;
		this.taughtLevelSuggestion = false;

		switch (type) {
			case "name":
				if(this.tmFormLessonDetail.get('name').valid){
					model = {name: this.tmFormLessonDetail.get('name').value};
					_.merge(defaultModal, model);
					saveData = true;
				}else{
					this.nameError = true;
					this.commonService.getFormValidationErrors(this.tmFormLessonDetail);
				}
				break;
			case "taughtLevel":
				if(this.tmFormLessonDetail.get('taughtLevel').valid){
					model = {taughtLevel: this.tmFormLessonDetail.get('taughtLevel').value};
					_.merge(defaultModal, model);
					saveData = true;
					this.taughtLevelSuggestion = true;
				}
				break;
			case "grade":
				if(this.tmFormLessonDetail.get('grade').valid){
					model = {grade: this.tmFormLessonDetail.get('grade').value};
					_.merge(defaultModal, model);
					saveData = true;
				}
			case "age":
				if(this.tmFormLessonDetail.get('age').valid){
					model = {age: this.tmFormLessonDetail.get('age').value};
					_.merge(defaultModal, model);
					saveData = true;
				}
				break;
			case "status":
					model = {status: status};
					_.merge(defaultModal, model);
					saveData = true;
				break;
			default:
				// code...
				break;
		}

		this.startUpload = false;
		if(saveData){
			console.log('updateOnChange defaultModal', defaultModal);
			if(showLoading){
				this.commonService.notifyFlashMsgChanges({isLoading:1});
			}
			this.lessonService.lessonOperations(defaultModal).subscribe(jsonData => {
				if(jsonData.error==0 && jsonData.data){
					if(type=='status'){
						this.lesson.status = (jsonData.data.status)? jsonData.data.status : this.lesson.status;
						this.router.navigate(['/mylessons'],{queryParams: {type: 'published'}});
					}
					if(type=='age'){
						this.lesson.age = (jsonData.data.age)? jsonData.data.age : this.lesson.age;
					}
					if(type=='grade'){
						this.lesson.grade = (jsonData.data.grade)? jsonData.data.grade : this.lesson.grade;
					}
					if(type=='taughtLevel'){
						this.lesson.taughtLevel = (jsonData.data.taughtLevel)? jsonData.data.taughtLevel : this.lesson.taughtLevel;
					}
					if(type=='name'){
						this.lesson.name = (jsonData.data.name)? jsonData.data.name : this.lesson.name;
					}
				}
				this.commonService.notifyFlashMsgChanges({isLoading:0});
			},
			err => {
				this.commonService.notifyFlashMsgChanges({isLoading:0});
			});
		}
	}

	resetAllForms(){
		this.lessonOutlineEdit = false;
		this.policyEdit = false;
	}

	publishLesson(){
		console.log(this.validateWholeData());
		if(this.validateWholeData()){
			this.updateOnChange(null, 'status', true, 'PUBLISHED');
		}
	}
	validateWholeData(){
		let hasError = false;
		this.buggyComponent = [];
		// Validate detail
		// Basic detail
        /*if(! (this.lesson.talent && !_.isEmpty(this.lesson.talent) && this.lesson.talent!="" && this.lesson.experience && !_.isEmpty(this.lesson.experience) && this.lesson.experience!="") ){
            validData = false;
        }*/

		if(!this.tmFormLessonDetail.get('name').valid){
			this.buggyComponent.push('lessonnameCom');
	        if(!hasError){
	          this.scrollSection = 'lessonnameSection';
	        }
	        hasError = true;
	    }

        // Session outline
        if(! (this.lesson.sessionOutline && !_.isEmpty(this.lesson.sessionOutline)) && this.lesson.sessionOutline!=""){
            this.buggyComponent.push('lessonoutlineCom');
	        if(!hasError){
	          this.scrollSection = 'lessonoutlineSection';
	        }
	        hasError = true;
        }

        // Session related detail
        if(! (this.lesson.sessionDuration>0 && this.lesson.minStudentPerSession>0 && this.lesson.studentPerSession>0 && this.lesson.sessionOutline!="" && this.lesson.isFreeTrial!="" )){
           	this.buggyComponent.push('lessondetailCom');
	        if(!hasError){
	          this.scrollSection = 'lessondetailSection';
	        }
	        hasError = true;
        }

        // Schedule detail
        if(! (this.lesson.schedule && this.hasScheduleData(this.lesson.schedule) )){
            this.buggyComponent.push('lessonscheduleCom');
	        if(!hasError){
	          this.scrollSection = 'lessonscheduleSection';
	        }
	        hasError = true;
        }

        // Fees detail
        if(! (this.lesson.fees && this.lesson.fees.hourlyRate>=0 && this.lesson.fees.groupDiscount.length>0 && this.lesson.fees.isGroupDiscount!="" && this.lesson.fees.extraFee!="")){
            this.buggyComponent.push('lessonfeesCom');
	        if(!hasError){
	          this.scrollSection = 'lessonfeesSection';
	        }
	        hasError = true;
        }
		// console.log("this.feesCom.isValidForm()", this.feesCom.isValidForm(), hasError, this.feesCom.getModelData());
		if(hasError){
			jQuery('#alert-pop').modal('show');
			return false;  
		}else{
			return true;
		}
	}
	hasScheduleData(scheduleData){
		let returnVal = false;
		_.forEach(scheduleData, function(value) {
	        if(value.length>0){
	          returnVal = true;
	        }
	    });
	    return returnVal;
	}
	// POPUP EDITING RELATED FUCNTIONS START 

	/*editSchedule(event, request){
		this.dataToEditSchedule = {schedule:_.clone(this.lesson.schedule)};
		this.currentRequestToEditSchedule = _.clone(this.lesson);

		console.log('editSchedule requestedSchedule dataToEditSchedule tmpdata', this.lesson.schedule, this.dataToEditSchedule);
		this.enableScheduleEditing = true;
		
		this.inlinePopupPosition = 'bottom-left';
		this.inlineViewMode = 'edit-schedule';
		this.triggeringPoint = event;
		this.inlinePopupEnabled = true;
	}
	onHide(event){
		console.log('onHide',event);
		this.inlineViewMode = '';
		this.inlinePopupEnabled = false;
		this.enableScheduleEditing = false;
		this.enableSessionEditing = false;
	}*/

	showOptionTooltip(event, type){
		this.enableScheduleEditing = false;
		this.enableSessionEditing = false;
		this.enableFeesEditing = false;

		let target = event.target || event.srcElement || event.currentTarget;
        target = target.offsetParent;

        let mainTarget: ElementRef;
        mainTarget = target;

        // console.log("lesson", mainTarget, lesson);
        // let pos = this.commonService.getPosition(elem.nativeElement);        
        if(mainTarget){
			// this.inlinePopupPosition = 'left';
			// this.inlinePopupPosition = 'bottom-left';
			this.inlinePopupPosition = 'bottom';

	        // this.tooltipTriggeringPoint = event;
	        this.tooltipTriggeringPoint = mainTarget;

	        this.inlineViewMode = type; // 'edit-schedule';
	        if(type=='edit-schedule'){
	        	this.enableScheduleEditing = true;
	        	this.dataToEditSchedule = {schedule:_.clone(this.lesson.schedule)};
	        }
	        if(type=='edit-session'){
	        	this.enableSessionEditing = true;
	        }
	        if(type=='edit-fees'){
	        	this.enableFeesEditing = true;
	        }
	        if(type=='edit-picture'){
	        	// No action required
				this.inlinePopupPosition = 'right';
	        }

			// this.currentRequestToEditSchedule = _.clone(this.lesson);
	        this.inlinePopupEnabled = true;
	    }
	}
	returnEditScheduleData(event){
		// c/onsole.log('returnEditScheduleData',event);
		this.onHideTooltip(null);
		
		if(event && event.isCancel){
			this.dataToEditSchedule = {schedule: []};
		}else{
			// Save edited schedule
			if(event.isValid){
				let that = this;
				let modelObject = _.transform(event.model, function(result, value, key) {
			        // result["tm."+key] = value;
			        result[key] = that.profileService.convertFormat(value);
			    }, {});
			    // event.hasNewScheduleData = true;
			    // event.model = modelObject;
			    console.log('tnUpdateSchedule modelObject', modelObject);
			    this.save(modelObject, true, 'tmFormSchedule');
				// this.saveForm.emit({model:{requestSchedule: modelObject, requestId: this.currentRequestToEditSchedule.requestId}, isValid: true, form: "tnUpdateSchedule"});
			}
		}
	}
	onHideTooltip(event){
		console.log('onHide',event);
		this.inlineViewMode = '';
		this.inlinePopupEnabled = false;
		this.enableScheduleEditing = false;
		this.enableSessionEditing = false;
		this.enableFeesEditing = false;
	}

	// TO UPDATE THE PICTURE
	uploadPicture(){
		this.onHideTooltip(null);
		this.startUpload = true;
	}
	uploadImage(event){
		// console.log('uploadImage',event.model.image);
		this.startUpload = false;
		if(event.model && event.model.image){
			// console.log("event.model", event.model);
			this.commonService.notifyFlashMsgChanges({isLoading:1});
			this.lessonService.lessonOperations({image: event.model.image, name:event.name, action:'uplaodLessonImage', lessonId:this.lesson._id}).subscribe(jsonData => {
				if(jsonData.error==0 && jsonData.data){
					this.lesson = jsonData.data;
				}
				this.commonService.notifyFlashMsgChanges({isLoading:0});
			},
			err => {
				this.commonService.notifyFlashMsgChanges({isLoading:0});
			});
		}
	}
	restoreDefaultPicture(event){
    	console.log("restoreDefaultPicture", event.model);
    	/*this.commonService.notifyFlashMsgChanges({isLoading:1});
    	let data = {profileImage: ''};
    	this.lessonService.restoreDefaultPicture(data).subscribe((jsonData)=>{
    		if(jsonData.error==0 && jsonData.user){
    			// this.user.profileImage = '';
    			this.authService.updateUserData(jsonData);
    			this.user = jsonData.user;
    		}
    		this.onHideTooltip(null);
    		this.commonService.notifyFlashMsgChanges({isLoading:0});
    	}, err =>{
    		// Nothing to do
    		this.commonService.notifyFlashMsgChanges({isLoading:0});
    	});*/
    }
	hideUpload(event){
		this.startUpload = false;
	}
	// TO UPDATE THE PICTURE FINISHED
	
	// POPUP EDITING RELATED FUCNTIONS FINISHED
}
