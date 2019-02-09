import { Injectable } from '@angular/core';
import { Http, Headers, Response, URLSearchParams } from '@angular/http';
import { Router, ActivatedRoute } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../common/auth.service';
import { DataService } from '../../../common/data.service';
import { CommonService } from '../../../common/common.service';


@Injectable()
export class MessageBoardService extends DataService {
  // private endpoint = environment.API_BASE_URL;	
  
  constructor(private http: Http, private auth: AuthService, private comm: CommonService,  protected router: Router) {
    super(http, auth, router);
  }

  getList(data) {
    let url = '/boardmessages/getList/';
    return this._sendPostRequest(data,url);
  }
}
