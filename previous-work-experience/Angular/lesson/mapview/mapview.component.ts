import { Component, OnInit, Output, Input, EventEmitter, SimpleChange, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FlashMessagesService } from 'angular2-flash-messages';
import { environment } from '../../../environments/environment';
import { messages } from '../../../environments/environment';

import { ValidateService } from '../../common/validate.service';
import { AuthService } from '../../common/auth.service';
import { CommonService } from '../../common/common.service';
import { LessonService } from '../lesson.service';

import { marker } from '../../interfaces/marker.interface';
import { LatLng } from '../../interfaces/latlng.interface';

import { TimeAgoPipe } from '../../pipes/time-ago';

import _ from 'lodash';
declare var jQuery:any;
declare var google:any;

@Component({
  selector: 'app-mapview',
  templateUrl: './mapview.component.html',
  styleUrls: ['./mapview.component.css'],
  providers: [TimeAgoPipe]
})
export class MapviewComponent implements OnInit {
  @Input('showInactive')
  showInactive: number = 0;

	@Input('currentView')
  currentView: string = '';

  @Input('hasTalentnooks')
  hasTalentnooks: boolean = false;

  // talentnook's list
  @Input('lessons')
  tnList: any = [];

	// Google Map related things
  protected mapProp;
  protected map = null;
  protected markerLoaded = false;
  protected nookMapContainer;
  protected masterMapContainer;
  protected bounds = null;
  protected zoom: number = 17;
  protected infowindow: any;
  protected lat: any = 37.712773;
  protected lng: any = -121.872022;
  protected defaultZip = "94568";

  protected currentLocation = {lat:this.lat,lng:this.lng};
  protected latlngbounds: LatLng; 
  protected markers = [];
  public enableUsLocation = "";

  protected loggedinUser: any;

  protected event: any = {filters : []};
  protected allfilters: any;
  protected isInit: boolean = false;

  constructor(
  	public elRef:ElementRef,
  	public commonService: CommonService,
  	public router: Router,
    public route: ActivatedRoute,
    public validateService: ValidateService,
    public authService: AuthService,
  	public flashMessage: FlashMessagesService,
  	protected lessonService: LessonService,
    public timeAgo: TimeAgoPipe
  ) { 
		if(environment.DEBUG_MODE){
      //console.log('constructor');
      this.enableUsLocation = "94582";
    }
    this.lat = environment.DEFAULT_LOCATION.lat;
    this.lng = environment.DEFAULT_LOCATION.lng;

    // environment.DEBUG_MODE = true;
  }

  ngOnInit() {
  	this.loggedinUser = this.authService.loadUser();
  	//console.log('ngOnInit',this.loggedinUser, this.loggedinUser.location);

    if(this.loggedinUser && this.loggedinUser._id!=""){    	
    	//console.log(this.loggedinUser.location.coordinates);
    	// TO SET THE CENTER POINT OF USER LOCATION BY DEFAULT
    	if(this.loggedinUser.location && this.loggedinUser.location.coordinates && this.loggedinUser.location.coordinates.length>0){
    		this.lng = this.loggedinUser.location.coordinates[0];
    		this.lat = this.loggedinUser.location.coordinates[1];
    	}

      if(typeof(google) != "undefined" && typeof(google.maps) != "undefined"){
	      this.mapProp = {
	        center: new google.maps.LatLng(this.lat, this.lng),
	        zoom: this.zoom,
	        scaleControl: false,
	        scrollwheel: false,
	        mapTypeId: google.maps.MapTypeId.ROADMAP
	      };
	    }
    }else{
    	this.router.navigate(['/login']);
    }
  }

  ngAfterViewInit(){
    if(environment.DEBUG_MODE)
      console.log('ngAfterViewInit');
    this.nookMapContainer = this.elRef.nativeElement.querySelector('#talentGoogleMap');
    this.loadTalentNooks();
  }

  ngOnChanges(changes: {[propName: string]: SimpleChange}) {
    if(!this.isInit) { return false; }

    if(changes['showInactive'] !== undefined){
      this.showInactive = changes['showInactive'].currentValue;
      // TODO: show and hide active and inactive markers

      // To trigger the map adjustment on when visible.
      /*setTimeout(function(){
        window.dispatchEvent(new Event('resize'));
      },10);*/

      if(this.isInit && this.showInactive && this.currentView=='map'){
        this.updateMarkers();
      }
    }
    if(changes['currentView'] !== undefined){
      this.currentView = changes['currentView'].currentValue;

      if(this.isInit && this.currentView=='map'){
      	if(this.map==null){ 
           this.initMap(); 
           this.updateMarkers();
        }else{ 
          let self = this;
          console.log("come in setTimeout self.updateMarkers();");
          window.dispatchEvent(new Event('resize'));
          self.updateMarkers();
          console.log("come in setTimeout self.updateMarkers(); finsih ");

          /*setTimeout(function(){
            window.dispatchEvent(new Event('resize'));
            self.updateMarkers();
          },10); */
        }
      }
    }

    if(changes['lessons'] !== undefined){
      this.tnList = changes['lessons'].currentValue;
    }
  }

  initMap(): void{
    if(environment.DEBUG_MODE)
      console.log('initMap');

    // IF GOOGLE IS NOT DEFINED OR NOT LOADED.
    if(typeof(google) == "undefined" || typeof(google.maps) == "undefined"){ return; }

    if(this.map==null){
      this.map = new google.maps.Map(this.nookMapContainer, this.mapProp);
    }else{
      google.maps.event.trigger(this.map, 'refresh');
    }
  }

  loadTalentNooks(){
    this.isInit = true;
    this.updateMarkers();
  }

  bindInfoWindow(marker, map, html): void {
    var self = this;
    var infowindow = new google.maps.InfoWindow({maxHeight: 50,borderRadius: 5});
     marker.addListener('mouseover', function() {
       // jQuery.find(".gm-style-iw").prev().addClass("testing");
      if (this.prevInfoWindow){
        this.prevInfoWindow.close();
      }

      this.prevInfoWindow = infowindow;
      infowindow.setContent(html);
      infowindow.open(map, this);
      jQuery(".gm-style-iw").prev().addClass("map-info-style");
    });

    marker.addListener('mouseout', function() {
      if (infowindow) {
        infowindow.close();
      }
    });

    marker.addListener('click', function() {
      //Checking for marker type
      if(marker.data.id && marker.data.id!=""){

        // self.router.navigate(['/lesson/'+marker.data.id]);
        // Now will redirect according to status.
        self.commonService.redirectionTNDetailPage(marker.data);
      }
    });
    // console.log('bindInfoWindow finish', new Date());
  } 

  updateMarkers(lat = "", long = ""): void {
    if(environment.DEBUG_MODE)
      console.log('updateMarkers',this.tnList.length);

    // IF GOOGLE IS NOT DEFINED OR NOT LOADED.
    if(typeof(google) == "undefined" || typeof(google.maps) == "undefined"){ return; }

    if(this.map==null){ this.initMap(); }
    
    this.clearMarkers();    
    if(this.bounds==null){ this.bounds = new google.maps.LatLngBounds(); }

    if (this.tnList.length) {
      // for(let search of this.tnList){
      for(let i=0;i<this.tnList.length;i++){
    		let search = this.tnList[i];
    		
    		let myLatlng = new google.maps.LatLng(search.location.coordinates[1], search.location.coordinates[0]);
        let distanceFromHome = this.distance(this.lat, this.lng, search.location.coordinates[1], search.location.coordinates[0], 'M');
        let imageName = '';
        let title = '';
        let dateTitle = '';
        let dateValue = '';
        let studentCountTitle = 'Student count';

        // Inactive is disabled
        if(this.showInactive){ 
          switch (search.status) {
            case "INACTIVE":
            case "DECLINED":
            case "SUSPENDED":
              imageName = 'inactive-marker-talentnook.png';
              title = 'Inactive';
              dateTitle = 'Created date';
              dateValue = (search.createdOn) ? this.timeAgo.transform(search.createdOn) : '---';
              break;
            case "CANCELED":
            case "CLOSED":
              imageName = 'closed-marker-talentnook.png';
              title = 'Closed/Completed';
              dateTitle = 'Closed date';
              dateValue = (search.updatedOn) ? this.timeAgo.transform(search.updatedOn) : '---';;
              break;
          }
        }

        switch (search.status) {
          case "ACTIVE":
            imageName = 'ongoing-marker-talentnook.png';
            title = 'Ongoing';
            dateTitle = 'Created date';
            dateValue = (search.createdOn) ? this.timeAgo.transform(search.createdOn) : '---';
            break;
          case "REQUESTED":
            imageName = 'requested-marker-talentnook.png';
            title = 'New Request';
            dateTitle = 'Requested date';
            dateValue = (search.createdOn) ? this.timeAgo.transform(search.createdOn) : '---';
            studentCountTitle = 'Intreseted student count';
            break;
          case "NOTLAUNCHED":
          case "DRAFT":
            imageName = 'closed-marker-talentnook.png';
            title = 'Waiting to Launch';
            dateTitle = 'Created date';
            dateValue = (search.createdOn) ? this.timeAgo.transform(search.createdOn) : '---';
            break;            
        }       

        let icon = {
            url: "/assets/images/"+imageName, 
            scaledSize: new google.maps.Size(32, 32), 
            origin: new google.maps.Point(0, 0), 
            anchor: new google.maps.Point(0, 0) 
        };
        
        let marker = new google.maps.Marker({
          position: myLatlng,
          map: this.map,
          icon: icon,
          data: {
            name: search.name,
            talent: (search.talent)? search.talent : "--",
            fullAddress: search.fullAddress,
            studentPerSession: search.studentPerSession,
            availableSlot: search.availableSlot,
            status: search.status,
            title: title,
            location: search.location,
            id: search._id,
            _id: search._id,
            rate: search.rate,
            headline: (search.headline)? search.headline : '',
            distance: distanceFromHome,
            dateTitle: dateTitle,
            dateValue: dateValue,
            studentCountTitle: studentCountTitle
          }
        });
        // console.log('updateMarkers marker lat lng ',search.location.coordinates[1], search.location.coordinates[0]);
        marker.setMap(this.map);
        // NO NEED FOR BOUND BECAUSE WE WILL KEEP THE CENTER ALWASY FOR THE HOME LOCATION.
        this.bounds.extend(marker.getPosition());
        this.markers.push(marker);
        //console.log(marker);
        let contentString = `<div class="mytnview-map-tooltip-cnt">
                              <div class="title">
                                ${marker.data.title}
                              </div>
                              <div class="content">
                                <div class="line"><span>${marker.data.studentCountTitle}:</span>&nbsp;<span><b>0</b></span></div>
                                <div class="line"><span>Talent:</span>&nbsp;<span><b>${marker.data.talent}</b></span></div>
                                <div class="line"><span>${marker.data.dateTitle}:</span>&nbsp;<span><b>${marker.data.dateValue}</b></span></div>
                                <div class="line"><span>Distance from home:</span>&nbsp;<span><b>${marker.data.distance} miles</b></span></div>
                              </div>
                            </div>`;
        this.bindInfoWindow(marker, this.map, contentString);
      }
    	this.markerLoaded = true;
      this.loadHomeMarker();
    }else{
    	this.markerLoaded = false;	
    	this.loadHomeMarker();
    }
    // console.log('updateMarkers finish', new Date());
  }

  loadHomeMarker(){
    if(environment.DEBUG_MODE)
      console.log("loadHomeMarker");

    // IF GOOGLE IS NOT DEFINED OR NOT LOADED.
    if(typeof(google) == "undefined"){ return; }

    if (this.lat && this.lng) {
      let icon = {
          url: "/assets/images/home-marker-talentnook.png", 
          scaledSize: new google.maps.Size(32, 32), 
          origin: new google.maps.Point(0,0), 
          anchor: new google.maps.Point(0, 0) 
      };

      let myLatlng = new google.maps.LatLng(this.lat, this.lng);
      var marker = new google.maps.Marker({
        position: myLatlng,
        map: this.map,
        icon: icon,
        data: {
          zip: ""
        }
      });

      // console.log('loadHomeMarker marker lat lng ',this.lat, this.lng);
      marker.setMap(this.map);
      this.setCenter(myLatlng);
    }else{
      this.setCenter(null);
    }
    // console.log('loadHomeMarker finish', new Date());
  }

  clearMarkers(): void{
    if(environment.DEBUG_MODE)
      console.log('clearMarkers');
    this.bounds = null;
    for (var i = this.markers.length - 1; i >= 0; i--) {
      this.markers[i].setMap(null);
    }
    this.markers = [];
    // console.log('clearMarkers finish', new Date());
  }

  setCenter(defaultLatlng): void {
    if(environment.DEBUG_MODE)
      console.log('setCenter',this.markerLoaded,this.markers.length);

    // IF GOOGLE IS NOT DEFINED OR NOT LOADED.
    if(typeof(google) == "undefined"){ return; }

    if (this.markers.length==0){
      let myLatlng = (!defaultLatlng)? new google.maps.LatLng(this.lat, this.lng) : defaultLatlng;
      // this.map.setCenter({lat:this.zipLat, lng:this.zipLong});
      this.map.setCenter(myLatlng);
      this.map.setZoom(this.zoom);
    }

    /*
    if(this.markerLoaded && this.markers.length>0){
      // Now we will set the zoom level always according to our default zoom level instead of setbound.
      this.map.fitBounds(this.bounds);
      this.map.setCenter(this.bounds.getCenter());

      let self = this;
      let zoomChangeBoundsListener = google.maps.event.addListenerOnce(self.map, 'bounds_changed', function(event) {
          console.log('google getZoom', this.getZoom());
          if ( this.getZoom() > 11 ){   // or set a minimum
              this.setZoom(self.zoom);  // set zoom here
          }
      });
      setTimeout(function(){google.maps.event.removeListener(zoomChangeBoundsListener)}, 2000);
    }else if (this.markers.length==0){
      let myLatlng = (!defaultLatlng)? new google.maps.LatLng(this.lat, this.lng) : defaultLatlng;
      // this.map.setCenter({lat:this.zipLat, lng:this.zipLong});
      this.map.setCenter(myLatlng);
      this.map.setZoom(this.zoom);
    }
    */
    // console.log('setCenter finish', new Date());
  }

  refreshMap(tab,subtab): void {
    if(environment.DEBUG_MODE)
      console.log('refreshMap',tab,subtab);

    this.updateMarkers();
  }

  distance(lat1, lon1, lat2, lon2, unit) {
    var radlat1 = Math.PI * lat1/180
    var radlat2 = Math.PI * lat2/180
    var theta = lon1-lon2
    var radtheta = Math.PI * theta/180
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist)
    dist = dist * 180/Math.PI
    dist = dist * 60 * 1.1515
    if (unit=="K") { dist = dist * 1.609344 }
    if (unit=="N") { dist = dist * 0.8684 }
    return dist.toFixed(4);
  }
}
