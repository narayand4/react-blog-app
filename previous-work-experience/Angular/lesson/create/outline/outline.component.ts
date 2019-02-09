import { Component, OnInit, Output, Input, EventEmitter, SimpleChange } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslatePipe } from 'ng2-translate';
import { FormGroup, FormArray, FormControl, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';

import { AuthService } from '../../../common/auth.service';
import { CommonService } from '../../../common/common.service';
import { ProfileService } from '../../../profile/profile.service';

import { FormatSchedule } from '../../../pipes/format-schedule';
import { urlValidator, numberValidator, rangeValidator, timerangeValidator, floatnumberValidator } from '../../../validators/custom-validation';

import _ from 'lodash';

@Component({
  selector: 'app-outline',
  templateUrl: './outline.component.html',
  styleUrls: ['./outline.component.css'],
  providers: [TranslatePipe]
})
export class OutlineComponent implements OnInit {
	// @ViewChild('form') form;
	@Input('data')
	objectData: any = {};

	@Input('lessonOutlineEdit')
	lessonOutlineEdit: boolean = false;

	@Input('isEditable')
	isEditable: boolean = false;

	@Input('isSingleForm')
	isSingleForm: boolean = false;

	@Input('parentComponent')
	parentComponent: string = 'tncreate';

	@Output('save')
	saveForm: EventEmitter<any> = new EventEmitter<any>();

	public tmFormLessonOutline: FormGroup; // our model driven form
	public taughtLevelList = ['Beginner', 'Intermediate', 'Advance'];
	private isInit = false;
	public initialLessonOutlineDescription: any = '';
	public lessonOutlineDescription: any = '';
	public lessonOutlineDescriptionError = true;
	public submitted = false;
	private editorLength: number = 1000;
	public user: any = '';
	public lbl_lessonoutline_for_parent: any = '';
	public contentUpdated = false;

	constructor(
		public profileService: ProfileService,
		public commonService: CommonService,
		public router: Router,
		public route: ActivatedRoute,
		public authService: AuthService,
		private _fb: FormBuilder,
		private translate: TranslatePipe,
	) { }

	ngOnInit() {
		this.updateFormData();
		this.user = this.authService.loadUser();		
	}

	ngOnChanges(changes: {[propName: string]: SimpleChange}) {
		if(!this.isInit){ return false;}
		if(changes['lessonOutlineEdit'] !== undefined){
		  this.lessonOutlineEdit = changes['lessonOutlineEdit'].currentValue;
		  // console.log('lessonOutlineEdit',this.lessonOutlineEdit,changes['lessonOutlineEdit']);
		}

		if(changes['objectData'] !== undefined){
		  this.objectData = changes['objectData'].currentValue;
		  this.updateFormData();
		  // console.log('objectData',this.objectData,changes['objectData']);
		}
	}

	updateFormData(){
		this.isInit = true;
		this.tmFormLessonOutline = this._fb.group({
	        sessionOutline: ['']
	    });

		this.tmFormLessonOutline.patchValue({
		  sessionOutline: (this.objectData && this.objectData.sessionOutline)? this.objectData.sessionOutline : "",
		});
		this.lessonOutlineDescription = (this.objectData && this.objectData.sessionOutline)? this.objectData.sessionOutline : "";
		this.initialLessonOutlineDescription = _.clone(this.lessonOutlineDescription);

		if(this.objectData && this.objectData.tmId && this.objectData.tmId.fname){
			let msg = this.translate.transform("lbl_lessonoutline_for_parent");
			this.lbl_lessonoutline_for_parent = msg.toString();
			this.lbl_lessonoutline_for_parent = _.replace(this.lbl_lessonoutline_for_parent, "{{TALENTMASTER}}", this.objectData.tmId.fname);
		}
	}

	saveEditorValue(){
		// sessionOutline content
		let content = this.lessonOutlineDescription ? String(this.lessonOutlineDescription).replace(/<[^>]+>/gm, '') : '';

		if(this.isValid()){
		  this.lessonOutlineDescriptionError = true;
		  let result = {"sessionOutline": this.lessonOutlineDescription }; 
		  this.save(result, true, 'tmFormLessonOutline');
		}
	}

	isValid(){
		let content = this.lessonOutlineDescription ? String(this.lessonOutlineDescription).replace(/<[^>]+>/gm, '') : '';
		// console.log("content.length this.editorLength", content.length, this.editorLength);
		if(content.length >= this.editorLength){
		  this.lessonOutlineDescriptionError = false;
		}else{
		  this.lessonOutlineDescriptionError = true;
		}
		return this.lessonOutlineDescriptionError;
	}

	save(model: any, isValid: boolean, form:String) {
		this.submitted = true;
		if(isValid){
		  // console.log(model,isValid,form)
		  this.initialLessonOutlineDescription = this.lessonOutlineDescription;
		  this.saveForm.emit({model:model,isValid:isValid,form:form});
		}
	}
	isParentOfTalentnook(){
		return (this.objectData && this.objectData.tmId && this.user && this.user._id == this.objectData.tmId._id)? false : true;
	}

	// SINGLE FORM RELATED FUNCTIONS
	isDirty(){
		// this.form.ngSubmit.emit();
		return (this.initialLessonOutlineDescription.length!=this.lessonOutlineDescription.length);
	}
	isValidForm(){
		// this.form.ngSubmit.emit();
		return this.isValid();
	}
	getLength(){
		let content = this.lessonOutlineDescription ? String(this.lessonOutlineDescription).replace(/<[^>]+>/gm, '') : '';
		return content;
	}
	getModelData(){
		this.initialLessonOutlineDescription = this.lessonOutlineDescription;
		return {"sessionOutline": this.lessonOutlineDescription };
	}
	// SINGLE FORM RELATED FUNCTIONS

}
