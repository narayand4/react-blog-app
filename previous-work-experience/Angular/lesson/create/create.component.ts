import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { FormGroup, FormArray, FormControl, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from 'ng2-translate';
import { AuthService } from '../../common/auth.service';
import { CommonService } from '../../common/common.service';
import { NotifyService } from '../../common/notify.service';
import { urlValidator, numberValidator, rangeValidator, timerangeValidator } from '../../validators/custom-validation';

import { ProfileService } from '../../profile/profile.service';
import { LessonService } from '../lesson.service';
import { FormatSchedule } from '../../pipes/format-schedule';
import { FormatTimeSchedule } from '../../pipes/format-time-schedule';
import { environment } from '../../../environments/environment';

import _ from 'lodash';
declare var jQuery:any;

@Component({
  selector: 'app-create',
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.css'],
  providers: [LessonService, ProfileService, FormatSchedule, TranslatePipe, FormatTimeSchedule]
})
export class TalentnookCreateComponent implements OnInit {
	public env: any = environment;
	public asset_path = `${environment.ASSETS}/${environment.TN_BANNERS}`;
	//`-----
	// @ViewChild('talentCom') talentCom;
	// @ViewChild('languageCom') languageCom;
	// @ViewChild('educationCom') educationCom;
	@ViewChild('lessondetailCom') lessondetailCom;
	@ViewChild('scheduleCom') scheduleCom;
	@ViewChild('feesCom') feesCom;
	@ViewChild('mediaCom') mediaCom;
	@ViewChild('policyCom') policyCom;
	@ViewChild('lessonOutlineCom') lessonOutlineCom;

	@ViewChild('headlineform') headlineform;
	@ViewChild('talentform') talentform;

	public isEditable: boolean = false; 
	public isSingleForm: boolean = false;
	public selectionType: string = '';
	public scheduleEdit: boolean = false
	public feesEdit: boolean = false
	public submitted: boolean = false;
	public headlineSubmit: boolean = false;
	public embedEdit: boolean = false;
	public skillEdit: boolean = false;
	public talentEdit: boolean = false;
	public headlineEdit: boolean = false;
	public noofSlotEdit: boolean = false;
	public bannerEdit: boolean = false;
	public languageEdit: boolean = false;
	public lessonOutlineEdit: boolean = false;
	public lessonDetailEdit: boolean = false;
	public policyEdit: boolean = false;
	public gridViewMode: string = "user"; // tm if talentmaster looking himself
	
	private sub: any;
	public imagePath: any = null;
	public bannerPath: any = null;
	public tnFormHeadline: FormGroup; // our model driven form
	public tnFormNoofSlot: FormGroup; // our model driven form
	public tnFormTalent: FormGroup; // our model driven form
	public tnFormBanner: FormGroup; // our model driven form
	public talentList = []; // our model driven form
	public tnName: string;
	public tnHeadline: string = "Get noticed with catchy headline";
	public tnData: any = { _id: "" };
	public lessonData: any;
	public user: any = {tm:{}};
	public sessionOutline: any;
	public lessonOutlineError: boolean = true;
	private editorLength: number = 1000;
	public tnId: any = new Date().getTime();
	public modelType: String;
	public editId: any;
	public loggedinUser: any;
	public tmInitialData: any;
	public hostData: any;
	public dataLoaded: boolean = false;

	// This will be used if user save and launch so before that we must check minimum required fields.
	public minimumRequiredSaved: boolean = false; 

	public stepsListStatus: any = [{status:false,title:'prgs_headline_name'}, {status:true,title:'prgs_talent'}, {status:false,title:'prgs_lesson_detail'}, {status:false,title:'prgs_availability'}, {status:false,title:'prgs_fees_detail'}];
  	public showProgress: boolean = false;
  	public parentEnabled: boolean = false;

  	public confirmType: number = 0;
  	public showConfirm: boolean = false;
  	public confirmTitle: string = "";
  	public confirmContent: string = "";
  	public delConfirmTitle: string = "";
  	public delConfirmContent: string = "";
  	public bgRemoveConfirmTitle: string = "";
  	public bgRemoveConfirmContent: string = "";

	public createOrEdit: boolean = false;
	public isGrandfathering: boolean = false;
	public currentUrl: string = '';
	public urlsub: any;

	public scrollSection: string = "";
  	public buggyComponent = [];

  	public skillsExp: string = "";
  	public education: string = "";
  	public educationDgree: string = "";
  	public breadcrumbData: any = [{linkurl:'/',label:'Home'},{linkurl:'', label: 'Lesson detail'}];


  	constructor(
  		public authService: AuthService,
    	public commonService: CommonService,
    	public notifyService: NotifyService,
    	public lessonService: LessonService,
    	public router: Router,
    	private _fb: FormBuilder,
    	private profileService: ProfileService,
    	public route: ActivatedRoute,
    	private translate: TranslatePipe,
  	) { 
  		this.imagePath = `${environment.API_BASE_URL}/lessons/uploadMedia/update`;
  		this.bannerPath = `${environment.API_BASE_URL}/lessons/uploadMedia/tnBanner`;
  	}

  	ngOnInit() {
  		this.modelType = this.translate.transform('talentnook');
  		this.tnName = this.translate.transform('phol_lesson_name');

  		// TO CHECK GRANDFATHERING
  		this.currentUrl = this.router.url;
  		this.updateGrandfathering();
  		/*this.urlsub = this.router.events.subscribe((event:any) => { 
	    	if (event instanceof NavigationEnd){
		        this.currentUrl = event.url;
		        this.updateGrandfathering();
	      	}
	    });*/
	    // TO CHECK GRANDFATHERING

  		// To check if parentmode is on.
  		this.parentEnabled = this.authService.isParentEnabled();

  		this.selectionType = "mynooks";
  		this.initForm();

  		this.createOrEdit = false;
  		this.sub = this.route.params.subscribe(params => {
  			this.loggedinUser = this.authService.loadUser();
  			if(this.router.url.toLowerCase().indexOf("create")!=-1 || this.router.url.toLowerCase().indexOf("creategflesson")!=-1){
  				this.updateGrandfathering();

  				this.createOrEdit = true;
		      	if(this.loggedinUser && !_.isEmpty(this.loggedinUser.id)){
			        this.isEditable = true;
			        // this.setSingleForm(true);
			        this.gridViewMode = "tm";
  					
  					this.fetchUserData();
		      	}else{
		      		this.router.navigate(['/login']);
		      	}
  			}else if(params['name'] && !_.isEmpty(params['name'])){
  				this.createOrEdit = false;
  				this.editId = params['name'];
  				this.fetchLessonData(); 
  			}else{
  				this.createOrEdit = false;
  				this.fetchUserData(); //tmInitialData which are using on both(create, update)
  			}
  		});

  		this.confirmTitle = this.translate.transform('tn_confirm_title');
  		this.confirmContent = this.translate.transform('tn_confirm_content');
  		
  		this.delConfirmTitle = this.translate.transform('tn_confirm_title');
  		this.delConfirmContent = this.translate.transform('tn_confirm_content');

  		this.bgRemoveConfirmTitle = this.translate.transform('tn_bgremove_confirm_title');
  		this.bgRemoveConfirmContent = this.translate.transform('tn_bgremove_confirm_content');
  	} 

  	ngOnDestroy() {
  		if(this.sub){
		    this.sub.unsubscribe();
		}
  		if(this.urlsub){
		    this.urlsub.unsubscribe();
		}
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

	// TO CHECK GRANDFATHERING
	updateGrandfathering(){
		if(this.currentUrl.toLowerCase().indexOf("creategflesson")!=-1){
        	this.isGrandfathering = true;
        }
	}

	refreshProgressBar(msecond: any = false){
		let that = this;
		let time = (msecond)? msecond : 500;
		setTimeout(function(){
		  that.updateProgress();
		},time);
	}

	fetchUserData(){
		this.profileService.getProfile().subscribe(data => {
			this.user = data.user;

			// Validate if user can create the new talentnook or not (published and backgroundVerified)
			if(this.createOrEdit){ // If create tn triggered
				if((this.user.tm && this.user.tm.isPublished) && this.user.verifiedBackground){
					this.tmInitialData = data.user;

					if(this.isEditable){
						this.updateFormData('tmdata');
					}
					this.dataLoaded = true;
				}else{
					// Because user can come through grandfathering option.
					/*if(this.isGrandfathering){
						this.router.navigate(['/']);
					}else{
						this.router.navigate(['/unauthorized']);
					}*/
					this.router.navigate(['/']);
				}
			}else{
				this.tmInitialData = data.user;
				if(this.isEditable){
					this.updateFormData('tmdata');
					this.dataLoaded = true;
				}
			}			
		}, err => {
	      	this.router.navigate(['/']);
	    });
	}

	updateViewCount(lessonId) : any {
	    let postdata = {lessonId: lessonId};

	    this.lessonService.updateViewCount(postdata).subscribe( (jsonResponse) => {
	      console.log(jsonResponse);
	      // this.setupUserData(profile);
	      this.commonService.notifyFlashMsgChanges({isLoading:0});
	    }, err => {
	      this.commonService.notifyFlashMsgChanges({isLoading:0});
	      console.log("updateViewCount",err);
	    });
  	}

	fetchLessonData(){
		this.commonService.notifyFlashMsgChanges({isLoading:1});

		this.lessonService.getDetail(this.editId).subscribe(data => {
			this.commonService.notifyFlashMsgChanges({isLoading:0});
			// console.log('fetchLessonData'); // ,data.lesson,this.loggedinUser
			if(this.loggedinUser && !_.isEmpty(this.loggedinUser._id) && (data.lesson && data.lesson.tmId && data.lesson.tmId._id) && data.lesson.tmId._id == this.loggedinUser._id){
		        if(data.lesson && data.lesson.status.toUpperCase()=="DRAFT"){
		        	this.isEditable = true;
	      		}

		        this.gridViewMode = "tm";
		        this.tnData = data.lesson;
		        this.isGrandfathering = (data.lesson.isGrandfathering)? data.lesson.isGrandfathering : false;
		        this.lessonData = data.sessionData;
		        console.log(this.tnData.status, this.tnData.status.toUpperCase());

		        // NOW EDITING WILL BE ENABLED ONLY ON DRAFT TN
		        /*if(this.tnData.status && this.tnData.status.toUpperCase()=='ACTIVE'){
		        	this.setSingleForm(false);
		        }else{
		        	this.setSingleForm(true);
		        }*/
		        // NOW EDITING WILL BE ENABLED ONLY ON DRAFT OR NEW TN
		        if(_.isEmpty(this.tnData.status) || this.tnData.status.toUpperCase()=='DRAFT'){
		        	this.setSingleForm(true);
		        }else{
		        	this.setSingleForm(false);
		        }

				this.tmInitialData = this.tnData.tmId;
				this.user = this.tnData.tmId;				

				this.hostData = this.tnData.hostId;
				this.updateFormData('tndata');
				
				// To update the count for the lesson views.
				this.updateViewCount(this.tnData._id);
				this.dataLoaded = true;
	      	}else{
	      		this.isEditable = false;
	      		this.gridViewMode = "user";
	      		// IF USER NOT PUBLISHED HIS NOOK THEN IT SHOULD NOT VISIBLE PUBLICALLY
	      		if(data.lesson && data.lesson.status.toUpperCase()=="DRAFT"){
	      			if(!(this.user && this.authService.isAdmin(this.user))) {
	      				this.router.navigate(['/unauthorized']);
			          	// this.router.navigate(['/404']);
			        }
			        this.dataLoaded = true;
	      		}else if(data.lesson && data.lesson.tmId){
	      			this.tnData = data.lesson;
	      			this.lessonData = data.sessionData;
	      			this.isGrandfathering = (data.lesson.isGrandfathering)? data.lesson.isGrandfathering : false;

					this.tmInitialData = this.tnData.tmId;
					this.user = this.tnData.tmId;

	      			this.hostData = this.tnData.hostId;
					// No need to load data in froms becaues that is view mode only
					
					// this.updateFormData('tndata');

					// To update the count for the lesson views.
					this.updateViewCount(this.tnData._id);
					this.dataLoaded = true;
	      		}else{
	      			if(!(this.user && this.authService.isAdmin(this.user))) {
	      				this.router.navigate(['/unauthorized']);
			          	// this.router.navigate(['/404']);
			        }
			        this.dataLoaded = true;
	      		}
	      	}
		}, err => {
	    	this.commonService.notifyFlashMsgChanges({isLoading:0});
	      	this.router.navigate(['/404']);
	    });
	}

	initTalentList(){
		if(this.tmInitialData && this.tmInitialData.tm.skills && this.tmInitialData.tm.skills.length>0){
			for (var i = this.tmInitialData.tm.skills.length - 1; i >= 0; i--) {
				if(this.tmInitialData.tm.skills[i].talent.name){
					this.talentList.push(this.tmInitialData.tm.skills[i].talent.name);
				}else{
					this.talentList.push(this.tmInitialData.tm.skills[i].talent);
				}
			}
		}
	}

	initForm(){
		this.tnFormHeadline = this._fb.group({
            name: ['', [<any>Validators.required, <any>Validators.maxLength(50)]],
            headline: ['', [<any>Validators.required, <any>Validators.maxLength(70)]]
        });

  		this.tnFormNoofSlot = this._fb.group({
  			liketohost: [''],
  			minStudentPerSession: ['', [<any>Validators.required, <any>numberValidator.validNumber]], 
  			studentPerSession: ['', [<any>Validators.required, <any>numberValidator.validNumber]] 
  		});

  		this.tnFormTalent = this._fb.group({
  			talent: ['', [<any>Validators.required]],
  			// languages: this._fb.array([])
  		});

  		this.tnFormBanner = this._fb.group({
  			bannerImage: ['']
  		});
	}

	getBackgroundImage(){
		if(this.tnData && this.tnData.profileImage && !_.isEmpty(this.tnData.profileImage)){
			let path = this.commonService.getTnBannersPath();
			return 'url("'+path+'/'+this.tnData.profileImage+'")';
		}else{
			// let defaultBanner = this.commonService.getDefaultTnBannerImage();
			// return 'url("'+defaultBanner+'")';
			// If user not uploaded any image then we need to show the empty.
			return 'none';
		}
	}

	// FORM RELATED FUNCTIONS
  	updateFormData(type: string){
  		if(type=='tmdata'){
  			this.tnData = this.user.tm;
  			this.tnData.schedule = [];
  			this.tnData._id = "";
  			this.tnData.talent = (this.user.tm.skills && this.user.tm.skills[0])? this.user.tm.skills[0].talent : '';
  			console.log('updateFormData',this.tnData);  			
  		}

  		// ALL DATA WILL BE SETUP BY THE TNDATA OBJECT ALWAYS
	  	this.tnFormHeadline.patchValue({
            name: this.tnData.name,
            headline: this.tnData.headline
        });

        this.tnFormNoofSlot.patchValue({
  			liketohost: this.tnData.liketohost,
  			minStudentPerSession: this.tnData.minStudentPerSession, 
  			studentPerSession: this.tnData.studentPerSession 
  		});

  		this.tnFormBanner.patchValue({
  			bannerImage: this.tnData.bannerImage
  		});

  		if(!_.isEmpty(this.tnData.talent)){
  			console.log('this.tnData.talent', this.tnData.talent, this.tnData.talent)
	  		this.tnFormTalent.patchValue({
	  			talent: (this.tnData.talent)? this.tnData.talent : ""
	  		});
	  	}
	  	// We don't need this part already handled above in first condition.
	  	/*else{
	  		console.log('else this.tmInitialData.talent', this.tmInitialData);
	  		if(this.tmInitialData && this.tmInitialData.tm.skills && this.tmInitialData.tm.skills.length>0){
	  			// this.tnFormTalent.get('talent').setValue((this.tmInitialData.talent[0])? this.tmInitialData.talent[0] : '');

	  			this.tnFormTalent.patchValue({
		  			talent: (this.tmInitialData.tm.skills && this.tmInitialData.tm.skills[0].talent)? this.tmInitialData.tm.skills[0].talent : ''
		  		});
	  		}
	  	}*/


  		this.initTalentList();
  		this.sessionOutline = (this.tnData.sessionOutline)? this.tnData.sessionOutline : "";

  		this.refreshProgressBar(250);
  		this.dataLoaded = true;

	}

	saveHeadline(model, isValid, form){
		// this.user.tm.name = model.name;
		// this.user.tm.headline = model.headline;
		this.headlineSubmit = true;
		this.save(model,isValid,form);
	}

	saveSlots(model, isValid, form){
		this.user.tm.liketohost = model.liketohost;
		this.user.tm.minStudentPerSession = model.minStudentPerSession;
		this.user.tm.studentPerSession = model.studentPerSession;
		this.save(model,isValid,form);
	}

	saveBanner(model, isValid, form){
		console.log(model.bannerImage);
		if(_.isEmpty(model.bannerImage)){
			this.bannerEdit = false;
		}else{
			this.user.tm.bannerImage = model.bannerImage;
			this.save(model,isValid,form);
		}
	}

	saveTalentDetail(event){
	    this.skillEdit = true;
	    this.user.tm.skills = event.model.skills;
	    this.save(event.model,event.isValid,event.form);
	}

  	saveScheduleDetail(event){
  		console.log("saveScheduleDetail",event.model);
	    this.scheduleEdit = true;
	    //this.user.tm.schedule = event.model;
	    this.save(event.model,event.isValid,event.form);
	}	

	saveFeesDetail(event){
	    this.feesEdit = true;
	    this.user.tm.fees = event.model.fees;
	    this.save(event.model,event.isValid,event.form);
	}

	saveLessonDetail(event){
		this.lessonDetailEdit = true;
	    // this.user.tm.fees = event.model.fees;
	    this.save(event.model,event.isValid,event.form);
	}

	// We may have this in future.
	saveLanguageDetail(event){
		// this.languageEdit = true;
	    // this.save(event.model,event.isValid,event.form);
	}

	saveMediaDetail(event){
	    this.embedEdit = true;
	    this.save(event.model,event.isValid,event.form);
	}

	savePolicyDetail(event){
	    this.policyEdit = true;
	    this.user.tm.policy = event.model["policy"];
	    this.save(event.model,event.isValid,event.form);
	}

	saveLessonOutlineDetail(event){
	    this.lessonOutlineEdit = true;
	    this.save(event.model,event.isValid,event.form);
	}

	saveEditorValue(form){
    	if(form==1){
      		let content = this.sessionOutline ? String(this.sessionOutline).replace(/<[^>]+>/gm, '') : '';
      		if(this.isValidAbout()){ 
	        	this.lessonOutlineError = true;
	        	this.user.tm.sessionOutline = this.sessionOutline;
	        	this.save(this.user.tm, true, 'tmFormLessonOutline');
	      	}
    	}
  	}

  	isValidAbout(){
		let content = this.sessionOutline ? String(this.sessionOutline).replace(/<[^>]+>/gm, '') : '';
		// console.log("aboutDescription",content, content.length, this.aboutDescription,this.aboutDescription.length);

		if(content.length >= this.editorLength){
		  	this.lessonOutlineError = false;
		}else{
		  	this.lessonOutlineError = true;
		}
		return this.lessonOutlineError;
	}

	// TO SAVE THE FORMS DATA
	save(model: any, isValid: boolean, form:String) {
		this.submitted = true; 
	    // set form submit to true

		if(this.isSingleForm || this.gridViewMode=='user'){ return false; }	    

	    // this.getFormValidationErrors();
	    switch (form) {
	      case "tnFormHeadline":
	      case "tnFormNoofSlot":
	      case "tnFormBanner":

	      // case "tmFormSkill":
	      case "tnFormTalent":
	      case "tmFormFees": 
	      case "tmFormLessonOutline":
	      case "tmFormLessonDetail":
	      case "tmFormLanguage":
	      case "tmFormPolicy":
	        if(isValid){
	          // this.saveTnProfile(this.user.tm, 'DRAFT');
	          let status = "DRAFT";
	          if(this.tnData._id && !_.isEmpty(this.tnData._id)){
	          	status = this.tnData.status;
	          }
	          this.saveTnProfile(model, form, status);
	        }
	        break;
	      case "tmFormSchedule":
	        if(isValid){
	          let that = this;
	          let modelObject = _.transform(model, function(result, value, key) {
	            result['schedule'] = that.profileService.convertFormat(value);
	          }, {});
	          this.user.tm.schedule = modelObject.schedule;
	          
	          let status = "DRAFT";
	          if(this.tnData._id && !_.isEmpty(this.tnData._id)){
	          	status = this.tnData.status;
	          }
	          // console.log('tmFormSchedule modelObject', modelObject);
	          this.saveTnProfile(modelObject, form, status);
	        }
	        break;
	      case "tmFormEmbed":
	        if(isValid){
	        	console.log('tmFormEmbed',model);
	          	this.saveTmMedia(model, form);
	        }
		    break;
	    }
	}

	saveTnProfile(model, formName, status) : any {
		model.status = status;
		model.formName = formName;
		model._id = (this.tnData._id)? this.tnData._id : "";
		model.liketohost = (this.tnData.liketohost)? this.tnData.liketohost : true;

		// IF GRANDFATHERING THEN NEED TO ADD GRANDFATHERING DATA AS WELL.
		model.isGrandfathering = this.isGrandfathering;
		console.log('saveTnProfile', model, status, this.user.tm.editId);
		// return false;

		this.commonService.notifyFlashMsgChanges({isLoading:1});
	    this.lessonService.saveTnProfile(model).subscribe(jsonData => {
	    	this.commonService.notifyFlashMsgChanges({isLoading:0});
	    	// console.log(jsonData);
	    	if(jsonData.error==0){
		    	if(formName.toLowerCase().indexOf('launch')!=-1 && this.isGrandfathering){
					this.tnData = jsonData.data;
					if(jsonData.data && jsonData.data._id){
		    			this.router.navigate(['/lesson/launch/'+jsonData.data._id+'/gftalentnook']);
					}else{
						this.router.navigate(['/mylessons']);	
					}
		    	}else if((formName.toLowerCase().indexOf('launch')!=-1) || (formName.toLowerCase().indexOf('launchLater')!=-1) || (formName.toLowerCase().indexOf('cancel')!=-1)){
		      		this.router.navigate(['/mylessons']);
		      	}else{
			    	this.tnData = jsonData.data;
			      	this.updateFormData('tndata');
			      	if(!this.isSingleForm){ 
			      		this.resetAllForms();
			      	}
		      	}
	    	}else{
	    		console.log(this.translate.transform('error_on_lesson_save'), jsonData.msg);
	    	}
	    }, err => {   
	    	if(!this.isSingleForm){ 
	      		this.resetAllForms();
	      	}   
	      	this.commonService.notifyFlashMsgChanges({isLoading:0});
	    });
	}

	saveTmMedia(model, form) : any {
	    this.commonService.notifyFlashMsgChanges({isLoading:1});
	    this.lessonService.saveTmMedia(model,form);
	    let type = (model.type=="video")? "embedurl" : (model.type=="image")? "uploadImages" : "remove";
	    // console.log(model,"saveTmMedia qq");
	    this.lessonService.saveTmMedia(model, type).subscribe(jsonData => {
	      this.commonService.notifyFlashMsgChanges({ isLoading: 0 });
	      // this.embedEdit = false;
	      // TODO:
	      //this.setupUserData(jsonData);
	      if(!this.isSingleForm){ 
	      	this.resetAllForms();
	  	  }
	    },
	    err => {
	      this.resetAllForms();
	      this.commonService.notifyFlashMsgChanges({ isLoading: 0 });
	    });
	}

	resetAllForms(){
		this.submitted = false;
		this.headlineSubmit = false;

	    this.embedEdit = false;
	    this.feesEdit = false;
	    this.skillEdit = false;
	    this.scheduleEdit = false;
	    this.lessonDetailEdit = false;
	    this.headlineEdit = false;
	    this.noofSlotEdit = false;
	    this.bannerEdit = false;
	    this.lessonOutlineEdit = false;
	    this.policyEdit = false;
	}

	validateMinimumRequired(fromDb: boolean = false){
	    /*console.log(this.tnFormHeadline.valid, `
				this.tnFormTalent.valid,
				this.lessondetailCom.isValidForm(), 
				(this.scheduleCom.isValidForm() && this.scheduleCom.hasData()),
				this.feesCom.isValidForm());*/

	    if(fromDb){
			if(this.tnFormHeadline.valid &&
				this.tnFormTalent.valid &&
				this.lessondetailCom.isValidForm() && 
				(this.scheduleCom.isValidForm() && this.scheduleCom.hasData()) &&
				this.feesCom.isValidForm()
			){
				return true;
			}else{
				return false;
			} 
	    }else{
			/*if(this.tnFormHeadline.valid && !_.isEmpty(this.tnFormHeadline.controls.name.value) && !_.isEmpty(this.tnFormHeadline.controls.headline.value) && 
				this.tnFormTalent.valid &&
				this.lessondetailCom.isValidForm() && 
				(this.scheduleCom.hasData(true) && this.scheduleCom.isValidForm()) &&
				this.feesCom.isValidForm()
			){
				return true;
			}else{
				return false;
			}*/

			let hasError = false;
			this.buggyComponent = [];

			if(!(this.tnFormHeadline.valid && !_.isEmpty(this.tnFormHeadline.controls.name.value) && !_.isEmpty(this.tnFormHeadline.controls.headline.value)) ){
				// this.lessondetailCom.enableDisableEdit(true);
				// this.tmFormHeadline.submitForm();

				this.headlineEdit = true;
				this.headlineform.ngSubmit.emit();

				this.buggyComponent.push('headlineSection');
			  	this.scrollSection = 'headlineSection';
			  	hasError = true;
			}
			// console.log("this.tnFormTalent.get('talent').value", this.tnFormTalent.valid, this.tnFormTalent.value, this.tnFormTalent.get('talent').value);
			if(!(this.tnFormTalent.valid && !_.isEmpty(this.tnFormTalent.get('talent').value)) ){
				this.buggyComponent.push('talentCom');
				this.talentform.ngSubmit.emit();

				if(!hasError){
				  this.scrollSection = 'tntalentSection';
				}
				hasError = true;
			}
			if(!(this.lessondetailCom.isValidForm())){
				this.buggyComponent.push('lessondetailCom');

				if(!hasError){
				  this.lessondetailCom.enableDisableEdit(true);
				  this.lessondetailCom.submitForm();
				  this.scrollSection = 'lessonSection';
				}
				hasError = true;
			}
			if(!(this.scheduleCom.isValidForm() && this.scheduleCom.hasData(true)) ){
				this.buggyComponent.push('scheduleCom');

				if(!hasError){
				  this.scheduleCom.enableDisableEdit(true);
				  this.scheduleCom.submitForm();
				  this.scrollSection = 'scheduleSection';
				}
				hasError = true;
			}
			if(!(this.feesCom.isValidForm()) ){
				this.buggyComponent.push('feesCom');

				if(!hasError){
				  this.feesCom.enableDisableEdit(true);
				  this.feesCom.submitForm();
				  this.scrollSection = 'feesSection';
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
	}

	validateTouchedForm(){
	    console.log('validateTouchedForm',this.tnFormHeadline.dirty,this.tnFormHeadline.valid);
	    // Headline section
	    if(this.tnFormHeadline.dirty){
	       if(!this.tnFormHeadline.valid){
	          // Set focus
	          this.headlineform.ngSubmit.emit();
	          console.log('tnFormHeadline false');
	          this.notifyService.notifyBottomScrollChanges({smoothScroll: 1, smoothScrollId: 'headlineSection'});
	          return false;
	       }
	    }

	    // About me section
	    /*let content = this.sessionOutline ? String(this.sessionOutline).replace(/<[^>]+>/gm, '') : '';
	    if(content.length>0){
	       if(!this.isValidAbout()){
	         // Set focus on about us
	         console.log('sessionOutline false');
	         this.notifyService.notifyBottomScrollChanges({smoothScroll: 1, smoothScrollId: 'aboutmeSection'});
	         return false;
	       }
	    }*/
	    // NOW IT'S A SEPARATE COMPONENT
	    let content = this.lessonOutlineCom.getLength();
	    if(content.length > 0){
	       if(!this.lessonOutlineCom.isValidForm()){
	         // Set focus on
	         console.log('lessonOutlineCom');
	         this.notifyService.notifyBottomScrollChanges({smoothScroll: 1, smoothScrollId: 'aboutmeSection'});
	         return false;
	       }
	    }

	    // Lesson detail section
	    if(this.lessondetailCom.isDirty()){
	       if(!this.lessondetailCom.isValidForm()){
	         this.lessondetailCom.submitForm();
	         // Set focus
	         console.log('lessondetailCom false');
	         this.notifyService.notifyBottomScrollChanges({smoothScroll: 1, smoothScrollId: 'lessonSection'});
	         return false;
	       }
	    }
	    // Schedule section
	    if(this.scheduleCom.isDirty()){
	       if(!this.scheduleCom.isValidForm()){
	         this.scheduleCom.submitForm();
	         // Set focus
	         console.log('scheduleCom false');
	         this.notifyService.notifyBottomScrollChanges({smoothScroll: 1, smoothScrollId: 'scheduleSection'});
	         return false;
	       }
	    }
	    // Fees section
	    if(this.feesCom.isDirty()){
	       if(!this.feesCom.isValidForm()){
	         this.feesCom.submitForm();
	         // Set focus
	         console.log('feesCom false');
	         this.notifyService.notifyBottomScrollChanges({smoothScroll: 1, smoothScrollId: 'feesSection'});
	         return false;
	       }
	    }
	    // Policy content
	    content = this.policyCom.getLength();
	    if(content.length > 0){
	       if(!this.policyCom.isValidForm()){
	         // Set focus on
	         console.log('policyCom');
	         this.notifyService.notifyBottomScrollChanges({smoothScroll: 1, smoothScrollId: 'policySection'});
	         return false;
	       }
	    }
	    // console.log('validated true');
	    return true;
	 }

	disableSendButton(event:any){
		if(event){
			this.commonService.notifyFlashMsgChanges({isLoading:1});
		}else{
			this.commonService.notifyFlashMsgChanges({isLoading:0});	
		}
	    console.log("disableSendButton",event);
	}

	imageRemoved(event:any){
		this.user.tm.bannerImage = "";
      	this.tnFormBanner.patchValue({
  			bannerImage: ""
  		});
	}

	imageUploaded(event:any){
		this.commonService.notifyFlashMsgChanges({isLoading:0});
		try{
	      	let response = JSON.parse(event.serverResponse._body);
	      	this.user.tm.bannerImage = response.filename;
	      	this.tnFormBanner.patchValue({
	  			bannerImage: this.user.tm.bannerImage
	  		});		      	
	    }catch(e){
	      // Do nothing
	      console.log(event.serverResponse.status);
	      // If user logged out or not logged in.
	      if(event.serverResponse.status==401){
	      	this.router.navigate(['/login']);
	      }
	    }
	}

	onProfileImageError(event){
	    this.commonService.setDefaultProfileImage(event);
	}

	getBannerImage(){
		if(this.tnData._id && this.tnData._id!="" && this.tnData.profileImage && this.tnData.profileImage!=""){
			return `${this.asset_path}/${this.tnData.profileImage}`;
		}else{
			return `${environment.ASSETS}/${environment.STORAGE}/default/tn-banner-talentnook.jpg`;
		}
	}

	onBannerImageError(event){
	    this.commonService.setDefaultTnBannerImage(event);
	}

	getProfileImage(imageName:any,userId:any){
	    return this.commonService.getProfileImage(imageName,userId,false);
	}

	drawRating(rating){
	    return this.commonService.drawRating('normal', rating, false);
	}


	// SINGLE FORM RELATTED FUNCTIONALITY
	setSingleForm(flag){
		if(flag){
			this.isSingleForm = true;

			this.headlineEdit = true;
			this.bannerEdit = true;
			this.lessonOutlineEdit = true;
			// this.skillEdit = true;
			this.talentEdit = true;
			// this.languageEdit = true;
			// this.educationEdit = true;
			// this.aboutEdit = true;
			this.lessonDetailEdit = true;
			this.scheduleEdit = true;
			this.feesEdit = true;
			this.embedEdit = true;
			this.policyEdit = true;
		}else{
			// Now we don't have inline editing for lesson so we don't need to false that.
			// this.isEditable = false;
			this.isSingleForm = false;

			this.headlineEdit = false;
			this.bannerEdit = false;
			this.lessonOutlineEdit = false;
			this.talentEdit = false;
			// this.skillEdit = false;
			// this.languageEdit = false;
			// this.educationEdit = false;
			// this.aboutEdit = false;
			this.lessonDetailEdit = false;
			this.scheduleEdit = false;
			this.feesEdit = false;
			this.embedEdit = false;
			this.policyEdit = false;
		}
	}

	saveIncomplete(){
		this.checkAllFormsStatus(false);
	}
	saveComplete(){
		if(this.parentEnabled){
			jQuery("#launch-info-pop").modal("show");
		}else{
			this.checkAllFormsStatus(true); 
		}
	}
	saveAndLaunch(){
		if(this.parentEnabled){
			jQuery("#launch-info-pop").modal("show");
		}else{
			// this.checkAllFormsStatus(true); 
			if(this.validateMinimumRequired()){
				this.submitAllForms();
		  		let data = this.prepareData();
		  		// console.log("data", data);
		  		
		  		if(this.tnFormBanner.valid && this.tnFormBanner.value.bannerImage && !_.isEmpty(this.tnFormBanner.value.bannerImage)){
			  		this.user.tm.bannerImage = this.tnFormBanner.value.bannerImage;
		  			_.merge(data,{"bannerImage": this.user.tm.bannerImage});
		  		}
			    this.saveTnProfile(data, 'launch', 'ACKNOWLEDGED');
			}else{
				// Now this will be done automatically
				// jQuery('#alert-pop').modal('show');
			}
		}
	}

	cancelEditing(){
		// Now cancel will be used to discard changes don't need to save anything in such case.
		// this.saveTnProfile(this.tnData, 'cancel', 'CANCELED');
		
		this.confirmTitle = this.delConfirmTitle;
		this.confirmContent = this.delConfirmContent;
		this.confirmType = 0;  // For the cancellation editing.
		this.showConfirm = true;
	}

	confirmOutput(response){
		this.showConfirm = false;
		if(response.response){
			if(this.confirmType==0){
				// Now cancel will be used to discard changes don't need to save anything in such case.
				// this.saveTnProfile(this.tnData, 'cancel', 'CANCELED');
				this.router.navigate(['/mylessons']);
			}else{
				this.commonService.notifyFlashMsgChanges({isLoading:1});
				let model = {formName:'tnFormBannerRemove', bannerImage: this.tnData.bannerImage, _id:this.tnData._id };
			    this.lessonService.saveTnProfile(model).subscribe(jsonData => {
			    	this.commonService.notifyFlashMsgChanges({isLoading:0});
			    	// console.log(jsonData);
			      	if(jsonData.error==0){
				    	this.tnData = jsonData.data;
				      	this.updateFormData('tndata');
				      	this.bannerEdit = false;
				      	/*if(!this.isSingleForm){ 
				      		this.resetAllForms();
				      	}*/
			      	}
			    }, err => {   
			    	if(!this.isSingleForm){ 
			      		this.resetAllForms();
			      	}   
			      	this.commonService.notifyFlashMsgChanges({isLoading:0});
			    });
			}			
		}
	}

	removeBackgroundImage(){
		this.confirmTitle = this.bgRemoveConfirmTitle;
		this.confirmContent = this.bgRemoveConfirmContent;
		this.confirmType = 1; // For the background image delete
		this.showConfirm = true;
	}

	checkAllFormsStatus(validate){
		// console.log('Able to save talentCom', this.talentCom.isValidForm() ,this.languageCom.isValidForm() ,this.educationCom.isValidForm());
		if(validate){
		  	// First validate all the forms
		  	if(this.validateMinimumRequired()){
				// this.saveTnProfile(this.tnData, 'launch', 'ACTIVE');
				// this.mediaCom.uploadMedia(); // Upload media intentionally

				this.submitAllForms();
		  		let data = this.prepareData();
		  		// console.log('data', data);
        		// return false;
		  		// To update the banner image if any uploaded.
		  		if(this.tnFormBanner.valid && this.tnFormBanner.value.bannerImage && !_.isEmpty(this.tnFormBanner.value.bannerImage)){
			  		this.user.tm.bannerImage = this.tnFormBanner.value.bannerImage;
		  			_.merge(data,{"bannerImage": this.user.tm.bannerImage});
		  		}
			    this.saveTnProfile(data, 'launch', 'ACTIVE');
			}else{
				// Now this will be done automatically.
				// jQuery('#alert-pop').modal('show');
			}
		}else{
			if(this.validateTouchedForm()){
				// this.saveTnProfile(this.tnData, 'launchLater', 'DRAFT');

				// this.mediaCom.uploadMedia(); // Upload media intentionally
				let data = this.prepareData();
				if(this.tnFormBanner.valid && this.tnFormBanner.value.bannerImage && !_.isEmpty(this.tnFormBanner.value.bannerImage)){
			  		this.user.tm.bannerImage = this.tnFormBanner.value.bannerImage;
		  			_.merge(data,{"bannerImage": this.user.tm.bannerImage});
		  		}
				this.saveTnProfile(data,'launchLater', 'DRAFT');
			}
		}
	}

	submitAllForms(){
		this.headlineform.ngSubmit.emit();
		this.talentform.ngSubmit.emit();

		this.lessondetailCom.submitForm();
		this.scheduleCom.submitForm();
		this.feesCom.submitForm();
	}

	prepareData(){
		let pepareData: any = {};

		// Headline
		/*if(this.tnFormHeadline.valid || !_.isEmpty(this.tnFormHeadline.controls.name.value) || !_.isEmpty(this.tnFormHeadline.controls.headline.value)){
		  _.merge(pepareData,this.tnFormHeadline.value);
		}*/
		if(this.tnFormHeadline.valid){
		  _.merge(pepareData,this.tnFormHeadline.value);
		}
		if(this.tnFormTalent.valid){
		  _.merge(pepareData,this.tnFormTalent.value);
		}
		// About me
		/*if(this.isValidAbout()){
		  let result = {"sessionOutline": this.sessionOutline }; 
		  _.merge(pepareData,result);
		}*/
		if(this.lessonOutlineCom.isValid()){
		  // let result = {"sessionOutline": this.sessionOutline }; 
		  let result = this.lessonOutlineCom.getModelData(); 
		  _.merge(pepareData,result);
		}
		if(this.lessondetailCom.isValidForm()){
		  _.merge(pepareData,this.lessondetailCom.getModelData());
		}
		if(this.scheduleCom.isValidForm()){
		  let that = this;
		  let modelObject = _.transform(this.scheduleCom.getModelData(), function(result, value, key) {
		    // result["tm."+key] = value;
		    result[key] = that.profileService.convertFormat(value);
		  }, {});

		  this.user.tm.schedule = modelObject.schedule;	          
		  _.merge(pepareData,modelObject);
		}
		if(this.feesCom.isValidForm()){
		  _.merge(pepareData,this.feesCom.getModelData());
		}
		if(this.policyCom.isValidForm()){
		  _.merge(pepareData,this.policyCom.getModelData());
		}

		return pepareData;
	}

	calculateProgress(){
	    let percent: number = 0;
	    let totalsection = 5;
	    let perSection = 100/totalsection;
	   
	    // prgs_headline_name
	    if(this.tnFormHeadline.valid){
	      percent = percent+perSection;
	    }
	    // prgs_talent_experience
	    if(this.tnFormTalent.valid){
		  percent = percent+perSection;
		}
	    // prgs_lesson_detail
	    if(this.lessondetailCom.isValidForm()){
	      percent = percent+perSection;
	    }
	    // prgs_availability
	    if(this.scheduleCom.isValidForm() && this.scheduleCom.hasData()){
	      percent = percent+perSection;
	    }
	    // prgs_fees_detail
	    if(this.feesCom.isValidForm()){
	      percent = percent+perSection;
	    }

	    return percent;
	}

  	updateProgress(){
	    /*
	    {status:false,title:'prgs_headline_image'}, // 0
	    {status:true,title:'prgs_talent_experience'}, // 1
	    {status:false,title:'prgs_language_education'}, // 2
	    {status:false,title:'prgs_lesson_detail'}, // 3
	    {status:false,title:'prgs_availability'}, // 4
	    {status:false,title:'prgs_fees_detail'} // 5
	    */
	    
		if(this.tnFormHeadline && this.tnFormTalent && this.lessondetailCom && this.scheduleCom && this.feesCom){
		  // prgs_headline_image
		  if(this.tnFormHeadline.valid && !_.isEmpty(this.tnFormHeadline.controls.name.value) && !_.isEmpty(this.tnFormHeadline.controls.headline.value)){
		    this.stepsListStatus[0].status = true;
		  }else{
		    this.stepsListStatus[0].status = false;
		  }
		  // prgs_talent_experience
		  if(this.tnFormTalent.valid){
		    this.stepsListStatus[1].status = true;
		  }else{
		    this.stepsListStatus[1].status = false;
		  }
		  // prgs_lesson_detail
		  if(this.lessondetailCom.isValidForm()){
		    this.stepsListStatus[2].status = true;
		  }else{
		    this.stepsListStatus[2].status = false;
		  }
		  // prgs_availability
		  if(this.scheduleCom.isValidForm() && this.scheduleCom.hasData()){
		    this.stepsListStatus[3].status = true;
		  }else{
		    this.stepsListStatus[3].status = false;
		  }
		  // prgs_fees_detail
		  if(this.feesCom.isValidForm()){
		    this.stepsListStatus[4].status = true;
		  }else{
		    this.stepsListStatus[4].status = false;
		  }

		  // console.log('updateProgress if', this.validateMinimumRequired(true));
		  // if(! (this.validateMinimumRequired(true) && this.tnData.status && this.tnData.status.toUpperCase()=='ACTIVE'))
		  if(!this.validateMinimumRequired(true) && (_.isEmpty(this.tnData.status) || this.tnData.status.toUpperCase()=='DRAFT')){
		    this.setSingleForm(true);
		    // this.updateDatabaseProgess(false, 100);
		  }else{
		    this.setSingleForm(false);
		    // this.updateDatabaseProgess(true, this.calculateProgress());
		  }

		  this.showProgress = true;
		  this.commonService.notifyFlashMsgChanges({isLoading:0});
		}else{
		  this.refreshProgressBar();
		}
	}
	// SINGLE FORM RELATTED FUNCTIONALITY

	hasScheduleData(scheduleData:any={}){
		let returnVal = false;
		if(scheduleData && scheduleData.schedule){
			_.forEach(scheduleData.schedule, function(value) {
			    if(value.length>0){
			      	returnVal = true;
			    }
			});
		}
		return returnVal;
	}
}
