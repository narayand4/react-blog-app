import { Component, OnInit, Output, Input, EventEmitter, SimpleChange } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormGroup, FormArray, FormControl, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';

import { AuthService } from '../../../common/auth.service';
import { CommonService } from '../../../common/common.service';
import { ProfileService } from '../../../profile/profile.service';

import { FormatSchedule } from '../../../pipes/format-schedule';
import { urlValidator, numberValidator, rangeValidator, timerangeValidator, floatnumberValidator } from '../../../validators/custom-validation';


@Component({
  selector: 'app-hostdetail',
  templateUrl: './hostdetail.component.html',
  styleUrls: ['./hostdetail.component.css']
})
export class HostdetailComponent implements OnInit {
	@Input('userContainer')
	objectData: any = {};

	@Input('hostDetailEdit')
	hostDetailEdit: boolean = false;

	@Input('isEditable')
	isEditable: boolean = false;

	@Input('isSingleForm')
	isSingleForm: boolean = false;

	@Input('parentComponent')
	parentComponent: string = 'launch';

	@Input('userViewMode')
	userViewMode: string = '';

	@Output('save')
	saveForm: EventEmitter<any> = new EventEmitter<any>();

	public tmFormLessonOutline: FormGroup; // our model driven form
	public taughtLevelList = ['Beginner', 'Intermediate', 'Advance'];
	private isInit = false;
	public lessonOutlineDescription: any = '';
	public lessonOutlineDescriptionError = true;
	public submitted = false;
	private editorLength: number = 1000;
	
	public isTmHost = false;
	public isTm = false;

	constructor(
		public profileService: ProfileService,
		public commonService: CommonService,
		public router: Router,
		public route: ActivatedRoute,
		public authService: AuthService,
		private _fb: FormBuilder
	) { }

	ngOnInit() {
		this.updateData();
	}

	ngOnChanges(changes: {[propName: string]: SimpleChange}) {
		if(changes['requestListEdit'] !== undefined){
		  this.hostDetailEdit = changes['hostDetailEdit'].currentValue;
		}

		if(changes['objectData'] !== undefined){
		  this.objectData = changes['objectData'].currentValue;
		  // console.log("changes['objectData", this.objectData);
		  this.updateData();
		}

		if(changes['userViewMode'] !== undefined){
		  this.userViewMode = changes['userViewMode'].currentValue;
		}

		if(changes['isEditable'] !== undefined){
		  this.isEditable = changes['isEditable'].currentValue;
		}
	}
	updateData(){
		if(this.objectData.tmuser && this.objectData.tmuser._id &&  this.objectData.user && this.objectData.user._id && this.objectData.tmuser._id == this.objectData.user._id){
			this.isTm = true;
		}
		if(this.objectData && this.objectData.hostuser && this.objectData.hostuser._id && this.objectData.user){
			// console.log('this.ob	jectData',this.objectData.user._id, this.objectData.tmuser._id, this.objectData.hostuser._id);
			if(this.objectData.hostuser && this.objectData.hostuser._id == this.objectData.user._id && this.objectData.tmuser._id == this.objectData.user._id){
				this.isTmHost = true;
			}else{
				this.isTmHost = false;
			}
		}else{
			this.isTmHost = false;
		}
	}

	makeMeHost(event,tmId) {
		let makeMeHost = event.target.checked;
	  	this.saveForm.emit({model: {hostId: tmId, makeMeHost: makeMeHost, isMakeMeHost: true}, isValid:true, form:"tnHostDetail"});
	}

	redirectOnPublicView(){
		if(this.objectData && this.objectData.tmuser && this.objectData.tmuser.username){
			this.router.navigate(['/talentmaster/'+this.objectData.tmuser.username]);
		}
		/*if(this.isTm){
			this.router.navigate(['/user']);
		}else{
			this.router.navigate(['/talentmaster'+this.objectData.user.username]);
		}*/
	}
}
