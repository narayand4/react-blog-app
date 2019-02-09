import { Component, OnInit, Input, Output, EventEmitter, SimpleChange } from '@angular/core';
import { TranslatePipe } from 'ng2-translate';

import  _ from "lodash";
declare var jQuery:any;


@Component({
  selector: 'app-tnheader',
  templateUrl: './tnheader.component.html',
  styleUrls: ['./tnheader.component.css'],
  providers: [TranslatePipe]
})
export class TnheaderComponent implements OnInit {
	@Input('talentnook')
	talentnook: any = {};

	@Input('talentNookId')
	talentNookId: any = '';	
	
	@Input('isJoinRequest')
	isJoinRequest: boolean = false;

	@Input('parentComponent')
	parentComponent: string = 'request'; // 'join', 'launch' and 'operations' are the possible values

	@Input('userViewMode')
	userViewMode: string = 'PARENT'; // 'TM' is the possible values

	@Input('header_msg')
	header_msg: string = ''; // This will be used to show notification or announcement.
	
	@Input('msgData')
	msgData: any = {unseenMsg: 0}; // This will be used to show notification or announcement.

	@Output('acceptDeclineRequest')
	acceptDeclineRequest: EventEmitter<any> = new EventEmitter<any>();

	@Output('askForValidationORConfirmation')
	askForValidationORConfirmation: EventEmitter<any> = new EventEmitter<any>();


  	public tnName: string = "";
	public showConfirm: boolean = false;
  	public confirmTitle: string = "";
  	public confirmContent: string = "";
  	
  	protected acceptCnfTitle: string = "";
  	protected acceptCnfContent: string = "";

  	protected declineCnfTitle: string = "";
  	protected declineCnfContent: string = "";
  	
  	protected suspendTitle: string = "";
  	protected suspendContent: string = "";

  	protected markascompleteTitle: string = "";
  	protected markascompleteContent: string = "";
  	protected actionType: string = 'accept'; // decline, suspend, mark_complete
  	
  	public yesButton: string = "";
  	public noButton: string = "";
  	protected yesButton1: string = "";
  	protected yesButton2: string = "";

  	public showReasonBox: boolean = true;

  	constructor(
  		private translate: TranslatePipe,
  	) { 
  	}

  	ngOnInit() {  		
  		this.acceptCnfTitle = this.translate.transform('tn_accept_confirm_title');
  		this.acceptCnfContent = this.translate.transform('tn_accept_confirm_content');

  		this.declineCnfTitle = this.translate.transform('tn_decline_confirm_title');
  		this.declineCnfContent = this.translate.transform('tn_decline_confirm_content');

  		this.suspendTitle = this.translate.transform('tn_suspend_cnf_title');
  		this.suspendContent = this.translate.transform('tn_suspend_cnf_content');

  		this.markascompleteTitle = this.translate.transform('tn_markascom_cnf_title');
  		this.markascompleteContent = this.translate.transform('tn_markascom_cnf_content');

  		this.yesButton1 = this.translate.transform('launch_this_lesson');
  		this.yesButton2 = this.translate.transform('yes');
  		this.noButton = this.translate.transform('cancel');
  	}

  	ngOnChanges(changes: {[propName: string]: SimpleChange}) {
		if(changes['talentNookId'] !== undefined){
		  	this.talentNookId = changes['talentNookId'].currentValue;
		}

		if(changes['talentnook'] !== undefined){
		  	this.talentnook = changes['talentnook'].currentValue;
		  	this.getTalentnookName();
		}

		if(changes['userViewMode'] !== undefined){
		  	this.userViewMode = changes['userViewMode'].currentValue;
		}

		if(changes['header_msg'] !== undefined){
		  	this.header_msg = changes['header_msg'].currentValue;
		}

		if(changes['msgData'] !== undefined){
		  	this.msgData = changes['msgData'].currentValue;
		}
	}

	scrollToMessage(){
		jQuery('html, body').animate({
	        scrollTop: jQuery("#messageBoardSection").offset().top - 160
	    }, 1200);
	}

	triggerAccept(flag:any){
		this.askForValidationORConfirmation.emit({modal: true});
	}
	acceptDecline(flag:any){
		if(flag){
			this.showReasonBox = false;
			this.actionType = 'accept';
			this.yesButton = this.yesButton1;
			this.confirmTitle = this.acceptCnfTitle;
			this.confirmContent = this.acceptCnfContent;
		}else{
			this.showReasonBox = true;
			this.actionType = 'decline';
			this.yesButton = this.yesButton2;
			this.confirmTitle = this.declineCnfTitle;
			this.confirmContent = this.declineCnfContent;
		}
		this.showConfirm = true;
	}
	confirmOutput(response){
		this.showConfirm = false;
		if(response.response){
			if(this.actionType=='accept'){
				this.sentAcceptDeclineRequest({acceptDecline: true, declineReason: response.reason});
			}if(this.actionType=='decline'){
				this.sentAcceptDeclineRequest({acceptDecline: false, declineReason: response.reason});
			}if(this.actionType=='suspend'){
				this.sendOperationAction({action: 'suspend', declineReason: response.reason});
			}if(this.actionType=='mark_complete'){
				let formname = "tnOperationActionForm";
				this.sendOperationAction({action: 'mark_complete', declineReason: response.reason}, formname);
			}			
		}
	}
	sentAcceptDeclineRequest(modeldata){
		this.acceptDeclineRequest.emit({model:modeldata, isValid: true, form:'tnAacceptDeclineForm'});
	}
	acknowledgeRequest(){
		this.acceptDeclineRequest.emit({model:{acceptDecline: false, declineReason: '', isAacknowledged: true}, isValid: true, form:'tnAcknowledgeForm'});
	}

	// Operation page action
	operationActions(action){
		switch (action) {
			case "mark_complete":
				this.showReasonBox = false;
				this.actionType = 'mark_complete';
				this.yesButton = this.yesButton2;
				this.confirmTitle = this.markascompleteTitle;
				this.confirmContent = this.markascompleteContent;
				this.showConfirm = true;

				break;
			case "activate":	
				this.sendOperationAction({action: 'activate', declineReason: ""});
				break;			
			case "suspend":
				this.showReasonBox = false;
				this.actionType = 'suspend';
				this.yesButton = this.yesButton2;
				this.confirmTitle = this.suspendTitle;
				this.confirmContent = this.suspendContent;
				this.showConfirm = true;

				break;
		}
		
	}
	// Operation page action
	sendOperationAction(modeldata, formname:any='tnOperationActionForm'){
		this.acceptDeclineRequest.emit({model:modeldata, isValid: true, form: formname});
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
	
	canDecline(){
		let allowedStatus = ['ACKNOWLEDGED','REQUESTED'];
		if(_.indexOf(allowedStatus,this.talentnook.status)!=-1){
			return true;
		}
		return false;
	}
}
