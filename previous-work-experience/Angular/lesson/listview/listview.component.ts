import { Component, OnInit, Output, Input } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NgForm, FormGroup, FormControl, Validators } from '@angular/forms';
import { AuthService } from '../../common/auth.service';
import { CommonService } from '../../common/common.service';
import { LessonService } from '../lesson.service';

declare var jQuery:any;
import _ from "lodash";

@Component({
  selector: 'app-listview',
  templateUrl: './listview.component.html',
  styleUrls: ['./listview.component.css'],
})
export class ListviewComponent implements OnInit {
	@Input('lessons')
  lessons: any ;

  @Input('type')
  type: any ;

  tnId:String = '';
  isSubmit:boolean = false;

  public addNoteForm = new FormGroup({
    note: new FormControl(""),    
    tnId: new FormControl(""),    
  });

	constructor(
  	public commonService: CommonService,
  	public router: Router,
    public route: ActivatedRoute,
    public authService: AuthService,
  	protected lessonService: LessonService
  ) { 
		
  }

  ngOnInit() {
  }

  openAddNote(tn){
    jQuery('div[id^="add-note-"]').show();
    this.tnId = tn._id;
    this.addNoteForm.patchValue({'tnId': tn._id, 'note': (tn.note && !_.isEmpty(tn.note))? tn.note : ""});
    jQuery('#add-note-'+tn._id).hide();    
  }

  closeAddNote(tn){
    this.tnId = '';
    jQuery('#add-note-'+tn._id).html(((tn.note && !_.isEmpty(tn.note)) ? tn.note : "Add Note"));
    jQuery('#add-note-'+tn._id).show();
  }

  saveTalentNote(noteFormValid) {
    this.isSubmit = true;
    if(noteFormValid){
      var formData = this.addNoteForm.value;

      this.commonService.notifyFlashMsgChanges({isLoading:1});
      this.lessonService.saveNote(formData).subscribe((res) => {
        this.handleResponse(res);
      },
      err => {
        this.commonService.notifyFlashMsgChanges({isLoading:0});
      });
      this.isSubmit = false;
    }
  }

  handleResponse (response) {
    for (var i = this.lessons.length - 1; i >= 0; i--) {
      if(this.lessons[i]._id==response.data._id){
        this.lessons[i].note = response.data.note;
        this.closeAddNote(response.data);
      }
    }
    this.commonService.notifyFlashMsgChanges({isLoading:0});
    // this.openAddNote(response.data);
    // this.closeAddNote(response.data);
  }
}
