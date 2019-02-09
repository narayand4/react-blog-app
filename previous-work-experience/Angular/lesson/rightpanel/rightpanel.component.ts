import { Component, OnInit, Output, Input, SimpleChange } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormGroup, FormArray, FormControl, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

import { AuthService } from '../../common/auth.service';
import { CommonService } from '../../common/common.service';
import { LessonService } from '../lesson.service';

import _ from 'lodash';

@Component({
  selector: 'app-rightpanel',
  templateUrl: './rightpanel.component.html',
  styleUrls: ['./rightpanel.component.css']
})
export class RightpanelComponent implements OnInit {
  	@Input('dataLoaded')
  	dataLoaded: boolean = false ;

  	@Input('published')
  	published: boolean = false ;

  	@Input('hasTalentnooks')
  	hasTalentnooks: boolean = false ;

  	@Input('showInactive')
  	showInactive: boolean = false ;

  	@Input('errorMessage')
  	errorMessage: any ;

  	@Input('errorMessageLink')
  	errorMessageLink: any ;
  	
  	@Input('gridData')
  	gridData: any = [];

  	@Input('lessons')
  	lessons: any = [];
  	talentnookList: any = [];

  	@Input('talentnookPayments')
  	talentnookPayments: any = [];
  	
  	@Input('user')
  	user: any = {};

  	@Input('rightpanelViewmode')
  	rightpanelViewmode: string = 'TM' ; // PARENT

  	@Input('currentView')
  	currentView: string = 'list'; // Default view will be map view.

  	public requestStatusForm: FormGroup;
  	public currentFilter: any = {}; // Default will list all the talentnook
  	public env = environment;

	constructor(
		public authService: AuthService,
		public commonService: CommonService,
		public lessonService: LessonService,
		private _fb: FormBuilder
	) { 

	}

  	ngOnInit() {
  		this.requestStatusForm = this._fb.group({
            statusBoxes: this._fb.array([])
        });
  		this.addStatus('show_all',true);
  		this.addStatus('requested');
  		this.addStatus('ongoing');
  		this.addStatus('waiting_to_launch');
  		this.addStatus('inactive');
  		this.addStatus('closed');
  	}

  	ngOnChanges(changes: {[propName: string]: SimpleChange}) {
	  	// if(!this.isInit){ return false;}
	  	if(changes['dataLoaded'] !== undefined){
	      	this.dataLoaded = changes['dataLoaded'].currentValue;
	  	}
	  	if(changes['published'] !== undefined){
	      	this.published = changes['published'].currentValue;
	  	}
	  	if(changes['hasTalentnooks'] !== undefined){
	      	this.hasTalentnooks = changes['hasTalentnooks'].currentValue;
	  	}
	  	if(changes['showInactive'] !== undefined){
	      	this.showInactive = changes['showInactive'].currentValue;
	  	}
	  	if(changes['errorMessage'] !== undefined){
	      	this.errorMessage = changes['errorMessage'].currentValue;
	  	}
	  	if(changes['gridData'] !== undefined){
	      	this.gridData = changes['gridData'].currentValue;
	  	}
	  	if(changes['user'] !== undefined){
	      	this.user = changes['user'].currentValue;
	  	}
	  	if(changes['rightpanelViewmode'] !== undefined){
	      	this.rightpanelViewmode = changes['rightpanelViewmode'].currentValue;
	  	}
	  	if(changes['lessons'] !== undefined){
	      	this.lessons = changes['lessons'].currentValue;
	      	this.talentnookList = [];
	      	this.refreshList();
	  	}

	  	// console.log(this.dataLoaded,this.hasTalentnooks,this.published,this.showInactive,this.errorMessage,this.rightpanelViewmode,this.gridData);
	  	// console.log(this.dataLoaded,this.hasTalentnooks,this.published,this.showInactive,this.rightpanelViewmode,this.gridData);
	  	// console.log(this.lessons);
	}

	changeView(view){
		this.currentView = view;
	}

  	hasData(type){
  		switch (type) {
  			case 1:
  				// new
  				if(this.gridData && this.gridData.new && this.gridData.new.length>0){
  					return true;
  				}
  				break;
  			case 2:
  				// ongoing
  				if(this.gridData && this.gridData.ongoing && this.gridData.ongoing.length>0){
  					return true;
  				}
  				break;
  			case 3:
  				// draft
  				if(this.gridData && this.gridData.draft && this.gridData.draft.length>0){
  					return true;
  				}
  				break;
  			case 4:
  				// inactive
  				if(this.gridData && this.gridData.inactive && this.gridData.inactive.length>0){
  					return true;
  				}
  				break;
  			
  			default:
  				// code...
  				break;
  		}
  		return false;
  	}

  	addStatus(statusName:any,value: boolean = false) {
	    (<FormArray>this.requestStatusForm.controls.statusBoxes).push(this.getStatusGroup(statusName,value));
	}
	getStatusGroup(statusName:any,value: boolean = false){
	    return this._fb.group({
	    	statusName: [statusName, []],
	        isSelected: [value, []]
	    });
	}
	updateStatus(event,statusName){
	    let requestControl = <FormArray>this.requestStatusForm.controls.statusBoxes;
	    let selectedStatusSchedule = null;
	    this.currentFilter = [];
	    let filters = [];

	    /*for (var i = 0; i < requestControl.controls.length; i++) {
	      if(requestControl.controls[i].get("statusName").value == statusName && event.target.checked){
	        requestControl.controls[i].get("isSelected").setValue(true);
	        filters = _.union(filters, this.getFilter(statusName));
	      }else{
	        requestControl.controls[i].get("isSelected").setValue(false);
	      }
	    }*/
	    
	    for (var i = 0; i < requestControl.controls.length; i++) {	    	
	      	if((requestControl.controls[i].get("statusName").value == statusName && event.target.checked) || requestControl.controls[i].get("isSelected").value == true){	      
	      		filters = _.union(filters, this.getFilter(requestControl.controls[i].get("statusName").value));
	      	}
	      	/*else{
	      		filters = _.without(filters, this.getFilter(requestControl.controls[i].get("statusName").value) );
	        	// requestControl.controls[i].get("isSelected").setValue(false);
	      	}*/
	    }
	    console.log(filters);

	    this.currentFilter = filters;
	    this.talentnookList = [];
	    this.refreshList();
	}
	getFilter(statusName){
		let filter = [];
		switch (statusName) {
			case "requested":
				filter = ['REQUESTED'];
			break;
			case "ongoing":
				filter = ['ACTIVE'];
			break;
			case "waiting_to_launch":
				filter = ['DRAFT','ACKNOWLEDGED'];
			break;
			case "inactive":
				filter = ['INACTIVE'];
			break;
			case "closed":
				filter = ['CLOSED','COMPLETED'];
			break;
			case "requested":
				filter = ['REQUESTED'];
			break;
			case "show_all":
				filter = ['ACTIVE', 'DRAFT', 'ACKNOWLEDGED', 'INACTIVE', 'REQUESTED', 'CLOSED', 'COMPLETED'];
			default:
				filter = [];
			break;
		}
		return filter;
	}
	refreshList(){
		let filteredList = [];

		if(this.currentFilter.length > 0){
			for (var i = 0; i < this.lessons.length; i++) {
				if(_.indexOf(this.currentFilter, this.lessons[i].status) >=0 ){
					filteredList.push(this.lessons[i]);
				}
			}
			this.talentnookList = filteredList;
		}else{
			this.talentnookList = this.lessons;
		}

		console.log("talentnookList: ", this.talentnookList, "talentnookPayments: ", this.talentnookPayments);
		
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
}
