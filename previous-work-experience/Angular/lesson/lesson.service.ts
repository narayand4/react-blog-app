import { Injectable } from '@angular/core';
import { Http, Headers, Response, URLSearchParams } from '@angular/http';
import { Router, ActivatedRoute } from '@angular/router';

import { environment } from '../../environments/environment';
import { AuthService } from '../common/auth.service';
import { DataService } from '../common/data.service';
import { CommonService } from '../common/common.service';


@Injectable()
export class LessonService extends DataService {
  // private endpoint = environment.API_BASE_URL;	
  
  constructor(private http: Http, private auth: AuthService, private comm: CommonService,  protected router: Router) {
    super(http, auth, router);
  }

  getList(data) {
    let url = '/lessons/getList/';
    return this._sendPostRequest(data,url);
  }  

  getUnseenMsgCount(data) {
    let url = '/lessons/getTotalUnseenMsg/';
    return this._sendPostRequest(data,url);
  }	

  getDetail(tnid) {
    let url = '/lessons/getDetail/' + tnid;
    return this._sendGetRequest(url);
  }  

  getDetailWithCount(data) {
    let url = '/lessons/getDetail';
    return this._sendPostRequest(data,url);
  }  

  interested(data) {
  	let url = '/lessons/interested/';
    return this._sendPostRequest(data, url);
  }

  saveNote(data) {
    let url = '/lessons/savenote/';
    return this._sendPostRequest(data, url);
  }	

  // To save the new reqeust and join request
  tnRequest(data) {
    let url = '/lessons/handleRequest/';
    return this._sendPostRequest(data, url);
  }

  saveTnProfile(data) {
    let url = '/lessons/create';
    return this._sendPostRequest(data, url);
  } 

  saveTalentnookDetail(data) {
    let url = '/lessons/saveDetail';
    return this._sendPostRequest(data, url);
  }  

  saveTmMedia(data,action) {
    let url = '/medias/uploadMedia/'+action;
    return this._sendPostRequest(data, url);
  } 

  getSessions(data) {
    let url = '/sessions/getSessionList/';
    return this._sendPostRequest(data, url);
  } 

  addLesson(data) {
    let url = '/sessions/addSession/';
    return this._sendPostRequest(data, url);
  } 

  addNote(data) {
    let url = '/sessions/addNote/';
    return this._sendPostRequest(data, url);
  }

  updateNoteStatus(data) {
    let url = '/sessions/updateSession/';
    return this._sendPostRequest(data, url);
  }

  updateViewCount(data) {
    let url = '/lessonviews/updateviews/';
    return this._sendPostRequest(data, url);
  }

  lessonOperations(data) {
    let url = '/lessons/quickoperations/';
    return this._sendPostRequest(data, url);
  }
}
