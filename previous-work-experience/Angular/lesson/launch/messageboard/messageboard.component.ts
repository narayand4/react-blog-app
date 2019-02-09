import { Component, OnInit, Output, Input, SimpleChange, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormGroup, FormArray, FormControl, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { SocketService } from '../../../common/socket.service';
import { AuthService } from '../../../common/auth.service';
import { CommonService } from '../../../common/common.service';
import { MessageBoardService } from './messageboard.service';

import { environment } from '../../../../environments/environment';

import _ from 'lodash';
declare var jQuery:any;

@Component({
  selector: 'app-messageboard',
  templateUrl: './messageboard.component.html',
  styleUrls: ['./messageboard.component.css'],
  providers: [MessageBoardService]
})
export class MessageboardComponent implements OnInit {
    @ViewChild("msgContainer") msgContainer: ElementRef;

	@Input('dataLoaded')
  	dataLoaded: boolean = false ;
	
	@Input('userViewMode')
  	userViewMode: string = 'TM'; // PARENT, TM

	@Input('launchOperation')
  	launchOperation: boolean = false; // false = launch, true = operations

    @Input('talentnook')
    talentnook: any = {};

  	@Input('msgData')
  	msgData: any = {unseenMsg: 0};

    @Input('userContainer')
    userContainer: any = {};

    public messageForm: FormGroup;
    public messages: any = [];
    public chatLocks: any = {updateListLock:false, chatLock:false};
    public lockedMessages: any = [];
    public editObject: any = {};
    public boardmsgTypings: any = [];
    public privateMessage: any = {};
    public env = environment;
    public DEBUG_SOCKET: boolean = false;
    public DEBUG_SOCKET_DATA: any;
    
    private msgboardSocketUpdate: any;
    private isInit: boolean = true;
    private subParam: any;
    private showMessageLoading: boolean = false;
    private hasPreviousMessages: boolean = true;
    private perMessageExpectedHeight: number = 20;

    public inlinePopupEnabled: boolean = false;
    public inlinePopupPosition: string = 'bottom-left';
    public dropInlinePopupEnabled: boolean = false;
    public triggeringPoint: any;
    public dropObject: any;

	constructor(
        private socket: SocketService, 
        public authService: AuthService, 
        public commonService: CommonService, 
        protected messageBoardService: MessageBoardService,
        public route: ActivatedRoute,
        public router: Router,
        private _fb: FormBuilder,
    ) {
		// console.log('this.socket',this.socket);
	}

  	ngOnInit() {
        this.env = environment;
  		this.messageForm = this._fb.group({
            message: ['', [<any>Validators.required]]
        });

        this.messages = [];        
        this.msgboardSocketUpdate = this.socket.notifyMsgboardSocketUpdateObservable$.subscribe((res) => {
            // console.log('msgboardSocketUpdate',res);
            if(res.hasOwnProperty('action')){
                if (res.action == 'StartTyping' && res.data) {
                    this._startTyping(res.data);
                }else if (res.action == 'StopTyping' && res.data) {
                    this._stopTyping(res.data);
                }else if (res.action == 'Add' && res.data) {
                    this._addMessage(res.data);
                }else if (res.action == 'Update' && res.data) {
                    this._updateMessage(res.data);
                }else if (res.action == 'UpdateId' && res.data) {
                    this._updateMessageId(res.data);
                }else if (res.action == 'Delete' && res.data) {
                    this._deleteMessage(res.data);
                }else if (res.action == 'LoadMissedMessages' && res.data) {
                    // This is now being done by the component and api to load initiall messages.
                    this._loadMessageForNetworkIssue(true, res.data);
                }else if (res.action == 'Reconnected') {
                    this.chatLocks.chatLock = false;
                    // this.chatLocks.updateListLock = true;
                    this._loadMessageForNetworkIssue();
                    this.DEBUG_SOCKET_DATA = 'Reconnected';
                }else if (res.action == 'Disconnected') {
                    this.chatLocks.chatLock = true;
                    this.DEBUG_SOCKET_DATA = 'Disconnected';
                }else if (res.action == 'UpdateSeenMsg' && res.data) {
                    // console.log('InboxUpdateSeenMsg', res.data);
                    this._updateSeenCounts(res.data);
                }
            }
        });
        console.log('ngOnInit initialized');

        if(this.isInit && this.talentnook._id && this.userContainer.user && this.userContainer.user._id){
            this.loadInitialMessage();
        }
	}
	ngOnDestroy() {
        if(this.msgboardSocketUpdate){
            console.log('ngOnInit unsubscribe');
            this.msgboardSocketUpdate.unsubscribe(); 
        }
        /*if(this.subParam){
            this.subParam.unsubscribe(); 
        }*/
	}
    ngOnChanges(changes: {[propName: string]: SimpleChange}) {
        if(changes['userContainer'] !== undefined){
              this.userContainer = changes['userContainer'].currentValue;
        }

        if(changes['userViewMode'] !== undefined){
          this.userViewMode = changes['userViewMode'].currentValue;
        }


        if(changes['talentnook'] !== undefined){
            this.talentnook = changes['talentnook'].currentValue;
            
            // if(this.isInit && this.talentnook._id && this.userContainer.user && this.userContainer.user._id){
            if(this.talentnook && this.talentnook._id && this.userContainer.user && this.userContainer.user._id){
                this.loadInitialMessage();
            }
        }
        // No need to update from parent this will be updated from child to parent.
        /*if(changes['msgData'] !== undefined){
          this.msgData = changes['msgData'].currentValue;
        }*/
    }
    ngAfterViewInit(){
        // console.log('ngAfterViewInit');
        // this.loadInitialMessage();
    }

    @HostListener('scroll', ['$event'])
    onScroll(event) {
        // console.log('onScroll', event);
        let target = event.target;
        if(target && this.hasPreviousMessages){
            let isTop = (target.scrollTop == 0)? true : false;
            if(isTop){
                this.loadPreviousMessages();
            }
        }
    }

    adjustScrollPosition(position:any=false){
        let self = this;
        setTimeout(function(){
            if(self.msgContainer.nativeElement){
                let nativeElem = self.msgContainer.nativeElement;
                let scrlHeight = nativeElem.scrollHeight;
                let scrlTop = nativeElem.scrollTop;
                console.log('scrlHeight,scrlTop Before ', nativeElem.scrollTop, scrlHeight, position);

                if(position){
                    // nativeElem.scrollTop = scrlHeight - position;
                    nativeElem.scrollTop = position;
                }else{
                    nativeElem.scrollTop = scrlHeight;
                }
                // console.log('scrlHeight,scrlTop After', nativeElem.scrollTop, scrlHeight);
            }
        },100);
    }

    loadInitialMessage(){
        this.messages = [];
        if(this.talentnook && this.userContainer && this.userContainer.user && this.talentnook._id && this.userContainer.user._id){
            let lastmsgId = '';
            let data = {
                tnId: this.talentnook._id,
                userId: this.userContainer.user._id,
                lastMessageId: lastmsgId,
                isReconnected: false
            }
            this.isInit = false;

            this.commonService.notifyFlashMsgChanges({isLoading:1})
            this.messageBoardService.getList(data).subscribe(jsonData => {
                // console.log('jsonData',jsonData);
                if(jsonData.error==0){
                    this._loadInitialMessage(jsonData.data);
                }

                this.commonService.notifyFlashMsgChanges({isLoading:0});
            },err =>{
                this.commonService.notifyFlashMsgChanges({isLoading:0});
            });
        }
    }

    loadPreviousMessages(){
        if(this.userContainer && this.userContainer.user && this.userContainer.user._id){
            // let lastmsgObject = this.messages[(this.messages.length-1)];
            let lastmsgObject = this.messages[0];
            if(lastmsgObject && lastmsgObject._id){
                // this.messageLoading(true);
                let firstmsgId = lastmsgObject._id;
                let data = {
                    tnId: this.talentnook._id,
                    userId: this.userContainer.user._id,
                    firstMessageId: firstmsgId,
                    isReconnected: false
                }

                this.commonService.notifyFlashMsgChanges({isLoading:1})
                this.messageBoardService.getList(data).subscribe(jsonData => {
                    // console.log('jsonData',jsonData);
                    if(jsonData.error==0){
                        if(jsonData.data.length > 0){
                            this._loadPreviousMessages(jsonData.data);
                            let scrollPos = jsonData.data.length * this.perMessageExpectedHeight;
                            console.log(scrollPos, jsonData.data.length, this.perMessageExpectedHeight);
                            this.adjustScrollPosition(scrollPos);
                        }else{
                            this.hasPreviousMessages = false;
                        }
                    }

                    this.commonService.notifyFlashMsgChanges({isLoading:0});
                },err =>{
                    this.commonService.notifyFlashMsgChanges({isLoading:0});
                });
            }
        }
    }
    

    sendPrivateMessage(flag:boolean = false,object:any = {}){
        // console.log("flag && object", flag, object);
        if(flag && object.msgsender && object.msgsender._id){
            this.privateMessage = {receiver: object.msgsender};
        }else{
            this.privateMessage = {};
        }
    }
  	sendMessage(isValid: boolean = false){
  		if(isValid){
            let tempId = 'boardmsg_id_'+Math.random();
            let msgsender = {
                _id: this.userContainer.user._id, 
                profileImage: this.userContainer.user.profileImage, 
                name: this.userContainer.user.fname+" "+this.userContainer.user.lname, 
                fname: this.userContainer.user.fname, 
                lname:this.userContainer.user.lname
            };
            let receiver = '';
            let type = 'PUBLIC';

            // In case user want to send private message
            if(this.privateMessage && !_.isEmpty(this.privateMessage.receiver)){
                receiver = this.privateMessage.receiver._id;
                type = 'PRIVATE';
            }
            let msg = this.messageForm.get("message").value;
            let messageData = {
                _id: '',
                tnId: this.talentnook._id,
                sender: this.userContainer.user._id,
                receiver: receiver, // Need to set if we are sending private message.
                type: type, // PUBLIC and PRIVATE
                isDeleted: false,
                message: msg,
                seenBy: '',
                createdOn: '', // We will always use the server side date time, it will be added automatically at API layer
                updatedOn: '',
                tempId: tempId,
                msgsender: msgsender, 
                callfor: 'everyone',
                eval: '',
                nsp : 'boardmsg',
                outgoing: true
            };

            // console.log("emitEventOnMsgboardSend ",messageData);
            this.socket.emitEventOnMsgboardSend(messageData);
            this.privateMessage = {};
            this.messages.push(messageData); // To store own created message, later on it's id will be updated.
            this.messageForm.get("message").setValue("");
            this.startStopTyping(null);
            this.adjustScrollPosition();
  		}else{
  			console.log("Error ");
  		}
  	}
    isSystemGenerated(object){
        // console.log('isSystemGenerated',object.msgsender.role);
        if(object && object.msgsender && object.msgsender.role){
            return (this.authService.isAdmin(object.msgsender) || this.authService.isSuperAdmin(object.msgsender) || this.authService.isSystemUser(object.msgsender));
        }
        return false;
    }
    deleteMessage(dropObject, event){
        this.dropObject = dropObject;
        this.triggeringPoint = event;
        this.inlinePopupEnabled = true;
        this.dropInlinePopupEnabled = true;
    }
    dropConfirm(flag){
        // console.log('deleteMessage', object._id);
        if(flag && this.dropObject){
            let object = this.dropObject;
            if(object._id){
                let index = _.findIndex(this.messages, function(subobject) { 
                    if(subobject && subobject._id == object._id){
                        return true;
                    }else{
                        return false;
                    }
                });
                if(index>=0){
                    let data = this.messages[index];
                    data.isDeleted = true; // To mark this delete;
                    console.log("emitEventOnMsgboardDeleted ", data);
                    this.socket.emitEventOnMsgboardDeleted(data);
                    // Delete for self;
                    this._deleteMessage(data);
                }else{
                    console.log("Error object not found can't delete.");
                }
            }else{
                console.log("Error no id selected to delete.");
            }
        }
        this.dropObject = null;
        this.dropInlinePopupEnabled = false;
        this.inlinePopupEnabled = false;
    }
    startStopTyping(event){
        if(event && event.target){
            let val = event.target.value;
            // console.log('startStopTyping', val);
            
            if(!_.isEmpty(val)){
                // START TYPING
                if(this.userContainer.user && this.userContainer.user._id){
                    let data = {
                        _id:this.userContainer.user._id, 
                        tnId:this.talentnook._id, 
                        profileImage:this.userContainer.user.profileImage, 
                        fname:this.userContainer.user.fname, 
                        lname:this.userContainer.user.lname, 
                        callfor: 'everyone'
                    }
                    this.socket.emitEventOnMsgboardStartTyping(data);
                }
            }else{
                // STOP TYPING
                let data = {
                    _id:this.userContainer.user._id, 
                    profileImage:this.userContainer.user.profileImage, 
                    fname:this.userContainer.user.fname, 
                    lname:this.userContainer.user.lname, 
                    callfor: 'everyone'
                }
                this.socket.emitEventOnMsgboardStopTyping(data);
            }
        }else{
            // STOP TYPING
            let data = {
                _id: this.userContainer.user._id, 
                tnId: this.talentnook._id, 
                profileImage: this.userContainer.user.profileImage, 
                fname: this.userContainer.user.fname, 
                lname: this.userContainer.user.lname, 
                callfor: 'everyone'
            }
            this.socket.emitEventOnMsgboardStopTyping(data);
        }
    }
    editMessage(object, isEdit:boolean = false){
        let index = _.findIndex(this.messages, function(subobject) { 
            if(object && subobject && subobject._id == object._id){
                return true;
            }else{
                return false;
            }
        });
        if(index>=0){
            if(isEdit){
                if(this.editObject && this.editObject._id){
                    this.resetEditObject();
                }
                this.messages[index].edit = isEdit;
                this.messages[index].tmpmessage = this.messages[index].message;
                this.editObject = _.clone(this.messages[index]);
                // console.log(this.editObject);
            }else{
                if(this.editObject && this.editObject._id){
                    this.resetEditObject();
                }
                this.messages[index].edit = isEdit;
            }
        }
    }
    saveMessage(object){
        let index = _.findIndex(this.messages, function(subobject) { 
            if(object && subobject && subobject._id == object._id){
                return true;
            }else{
                return false;
            }
        });
        if(index>=0){
           this.messages[index].edit = false;
           this.messages[index].message = this.editObject.message;
           this.socket.emitEventOnMsgboardUpdated(this.messages[index]);
        }
    }
    resetEditObject(){
        let self = this;
        let index = _.findIndex(this.messages, function(subobject) { 
            if(self.editObject && subobject && subobject._id == self.editObject._id){
                return true;
            }else{
                return false;
            }
        });
        if(index>=0){
            this.messages[index].edit = false;
            this.messages[index].tmpmessage = '';
            this.editObject = {};
        }
    }
    prepareMessageFormat(objectData){
        // console.log('prepareMessageFormat', objectData.sender);
        let msgsender = {
            _id: objectData.sender._id, 
            profileImage: objectData.sender.profileImage, 
            name: objectData.sender.fname+" "+objectData.sender.lname,
            fname: objectData.sender.fname, 
            lname:objectData.sender.lname,
            role: objectData.sender.role
        };
        let receiverid = (objectData.receiver && objectData.receiver._id)? objectData.receiver._id : '';
        let outgoing = false;
        if(objectData.sender._id == this.userContainer.user._id){
            outgoing = true;
        }

        let msgData = {
            _id: objectData._id,
            tnId: objectData.tnId._id,
            sender: objectData.sender._id,
            receiver: receiverid, // Need to set if we are sending private message.
            type: objectData.type, // 'PUBLIC', // PUBLIC and PRIVATE
            isDeleted: objectData.isDeleted,
            message: objectData.message,
            seenBy: objectData.seenBy,
            createdOn: objectData.createdOn,
            updatedOn: objectData.updatedOn,
            tempId: (objectData.tempId)? objectData.tempId : '',
            msgsender: msgsender,
            callfor: 'everyone',
            eval: '',
            nsp: 'boardmsg',
            outgoing: outgoing
        };

        return msgData;
    }
    // To update the total seen messages through socket at server side.
    updateSeenMsgTotal(){
        // console.log('updateSeenMsgInboxTotal', this.messages);
        // IF ADMIN IS LOGGED IN AS USER THEN NO NEED TO UPDATE SEEN-UNSEEN AT ALL.
        if(this.authService.isLoginAs()){ return false; }

        if(this.talentnook._id && this.userContainer.user && this.userContainer.user._id && this.messages && this.messages.length>0){
            let data = {
                fromUserId: this.userContainer.user._id,
                tnId: this.talentnook._id,
                fromMsgId: this.messages[0]._id,
                toMsgId: this.messages[(this.messages.length - 1)]._id
            }
            // console.log('before emitEventOnInboxMsgSeen',data);
            this.socket.emitEventOnMsgSeen(data);
        }
    }
    // To udpate the toal seen message in parent component after updating on server side.
    updateSeenMessages(){
        console.log('notifyMsgBoardUnreadChanges', this.msgData.unseenMsg);
        this.socket.notifyMsgBoardUnreadChanges({action:'totalUnseenMsg', data: {unseenMsg: this.msgData.unseenMsg}});
    }


    // TRIGGERED BY EVENT HANDLING.
    private _loadInitialMessage(objects){
        if(objects && objects.length>0){
            let index = -1, pushObject = [], messageRecord = null;
            for (var i = objects.length - 1; i >= 0; i--) {
                // index = _.findIndex(this.messages, ['_id', objects.messageList[i]._id]);
                index = _.findIndex(this.messages, function(subobject) {
                    if(objects[i] && subobject && subobject._id == objects[i]._id){
                        return true;
                    }else{
                        return false;
                    }
                });

                if(index==-1 && objects[i].sender && objects[i].sender._id){
                    messageRecord = this.prepareMessageFormat(objects[i]);
                    pushObject.push(messageRecord);
                    // pushObject.unshift(messageRecord); // Because need to load previous message not the recent one.
                    // console.log('index found ', messageRecord, objects[i]);
                }
            }
            // _.sortBy(pushObject, ['createdOn']);
            this.messages = pushObject;
            this.adjustScrollPosition();
        }else{
            console.log('Error _loadInitialMessage', objects);
        }
    }
    private _loadMessageForNetworkIssue(sendReceive:boolean=false, objects:any=false){ // false to send, ture to received
        if(sendReceive){ 
            // Received
            if(objects.messageList && objects.messageList.length>0){
                let index = -1, pushObject = [], messageRecord = null;
                pushObject = _.clone(this.messages);
                for (var i = objects.messageList.length - 1; i >= 0; i--) {
                    index = _.findIndex(this.messages, function(subobject) {
                        if(objects[i] && subobject && subobject._id == objects.messageList[i]._id){
                            return true;
                        }else{
                            return false;
                        }
                    });

                    if(index==-1 && objects.messageList[i].sender && objects.messageList[i].sender._id){
                        messageRecord = this.prepareMessageFormat(objects.messageList[i]);
                        pushObject.push(messageRecord);
                        // console.log('index found ', messageRecord, objects[i]);
                    }
                }
                
                this.chatLocks.updateListLock = true;
                this.messages = pushObject;
                this.chatLocks.updateListLock = false;
                this._loadMissedMessage(this.lockedMessages); // Message that we stored during update lock, may be someone pushed at that time.

                this.adjustScrollPosition();
            }else{
                console.log('No data _loadInitialMessage', objects);
            }
        }else{ 
            // Send
            if(this.talentnook && this.userContainer && this.userContainer.user && this.talentnook._id && this.userContainer.user._id){
                let lastmsgId = '', lastMessageTimestamp = '';
                if(this.messages.length > 0){
                    let lastmsg = this.messages[(this.messages.length - 1)];
                    lastmsgId = lastmsg._id;
                    lastMessageTimestamp = lastmsg.createdOn;
                }
                let data = {
                    tnId: this.talentnook._id,
                    userId: this.userContainer.user._id,
                    lastMessageId: lastmsgId,
                    lastMessageTimestamp: lastmsgId,
                    isReconnected: true
                }
                this.socket.emitEventOnMsgboardGetmessages(data);
            }
        }
    }
    private _loadMissedMessage(objects){
        if(objects && objects.length>0){
            let index = -1, messageRecord = null;
            for (var i = 0; i< objects.length; i++) {
                index = _.findIndex(this.messages, function(subobject) {
                    if(objects[i] && subobject && subobject._id == objects[i]._id){
                        return true;
                    }else{
                        return false;
                    }
                });

                if(index==-1){
                    this.messages.push(objects[i]);
                    // console.log('index found ', messageRecord, objects[i]);
                }
            }
            this.adjustScrollPosition();
        }else{
            console.log('No data _loadMissedMessage', objects);
        }
    }
    private _loadPreviousMessages(objects){
        if(objects && objects.length>0){
            let index = -1, messageRecord = null;
            // for (var i = 0; i < objects.length ; i++) {
            for (var i = objects.length - 1; i >= 0; i--) {
                index = _.findIndex(this.messages, function(subobject) {
                    if(objects[i] && subobject && subobject._id == objects[i]._id){
                        return true;
                    }else{
                        return false;
                    }
                });

                if(index==-1 && objects[i].sender && objects[i].sender._id){
                    messageRecord = this.prepareMessageFormat(objects[i]);
                    // this.messages.push(objects[i]); // Because need to load previous message not the recent one.
                    this.messages.unshift(messageRecord); // Because need to load previous message not the recent one.
                }
            }
            // Update the seen at server side through socket.
            this.updateSeenMsgTotal();
        }else{
            console.log('No data _loadPreviousMessages', objects);
        }
    }
    private _updateMessage(object){
        let index = _.findIndex(this.messages, function(subobject) { 
            if(object && subobject && subobject._id == object._id){
                return true;
            }else{
                return false;
            }
        });
        if(index>=0){
            if(object.sender && this.userContainer.user && object.sender == this.userContainer.user._id){
                object.outgoing = true;
            }
            this.messages[index].message = object.message;
            this.messages[index].isDeleted = object.isDeleted;
            this.messages[index].updatedOn = object.updatedOn;
        }
    }
  	private _updateMessageId(object){
  		let index = _.findIndex(this.messages, function(subobject) { 
                if(object && subobject && subobject.tempId == object.tempId){
                    return true;
                }else{
                    return false;
                }
            });
        
        // console.log("index _updateMessageId object", index, object);
        if(object.sender && object.sender == this.userContainer.user._id){
            object.outgoing = true;
  		    if(index>=0){
                this.messages[index] = object;
            }else {
                // IN CASE MULTIPLE USER LOGIN WITH SAME EMAIL ID
                if(this.chatLocks.updateListLock){
                    this.lockedMessages.push(object);
                }else{
                    this.messages.push(object);
                    this.adjustScrollPosition();
                }
            }
        }
  	}
  	private _addMessage(object){
        // console.log('_addMessage',object, this.messages);
        if(object && object.tnId == this.talentnook._id){
            if(object.sender && object.sender == this.userContainer.user._id){
                object.outgoing = true;
            }
            if(this.chatLocks.updateListLock){
                // console.log('this.chatLocks.updateListLock',this.chatLocks.updateListLock);
                this.lockedMessages.push(object);
            }else{
                // console.log('ELSE this.chatLocks.updateListLock',object);
                this.messages.push(object);
                // console.log('ELSE this.chatLocks.updateListLock List',this.messages);
            }
            this.adjustScrollPosition();
        }
  	}
  	private _deleteMessage(object){
        let clonedObject = _.clone(this.messages); 
        console.log('_deleteMessage', object._id);
  		let removedElements = _.remove(clonedObject, function(subobject) {
            // console.log('_deleteMessage if ',subobject._id , object._id, subobject.isDeleted);
            if(object && subobject && (subobject._id == object._id || subobject.isDeleted)){
                return true;
            }else{
                return false;
            }
		});
		this.messages = clonedObject;
        this.adjustScrollPosition();
  	}
    private _startTyping(object){
        // console.log('_startTyping', object);
        let self = this;
        let removedUser = _.remove(object, function(subobject) {
            // console.log('_startTyping if ',subobject._id , object._id);
            if(self.userContainer.user._id == subobject._id || subobject.tnId != self.talentnook._id){
                return true;
            }else{
                return false;
            }
        });
        this.boardmsgTypings = object;
    }
    private _stopTyping(object){
        let self = this;
        let removedUser = _.remove(object, function(subobject) {
            // console.log('_startTyping if ',subobject._id , object._id);
            if(self.userContainer.user._id == subobject._id || subobject.tnId != self.talentnook._id){
                return true;
            }else{
                return false;
            }
        });
        this.boardmsgTypings = object;
    }
    private _updateSeenCounts(datalist){
        // console.log('_updateSeenCounts', datalist.dataset);

        if(this.userContainer.user && datalist.callfor==this.userContainer.user._id && datalist.dataset){
            let totalUnseenMsg = 0;
            if(datalist.dataset && datalist.dataset.length>0){
                for (var i = datalist.dataset.length - 1; i >= 0; i--) {
                    totalUnseenMsg = totalUnseenMsg + ((datalist.dataset[i].unseenMsg)? datalist.dataset[i].unseenMsg : 0);
                }
            }
            this.msgData.unseenMsg = totalUnseenMsg;
            // To update total seen in inbox menu
            this.updateSeenMessages();
        }
    }
    // TRIGGERED BY EVENT HANDLING.
}
