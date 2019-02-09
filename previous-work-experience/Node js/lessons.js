const mongoose = require( 'mongoose' );
const moment = require("moment-timezone");
moment.tz.setDefault(process.env.TZ);

const parseXlsx = require('excel');
const Q = require('q');
const MyObjectId = require('mongoose').Types.ObjectId;
const User = require('../models/users');
const CommonModel = require('../models/common');
const BoardMessage = require('../models/boardmessages');
const InviteFriend = require('../models/invitefriends');
const Session = require('../models/sessions');
const TnCash = require('../models/tncash');
const Paymentsummary = require('../models/paymentsummary');
const response = {"error":0,"message":'',"data":''};
const jadeCompiler = require(__dirname + '/../lib/jadeCompiler');
const mailer = require(__dirname + '/../lib/mailer');
const FROM_ADDRESS = config.email.default.from;

const Lessons = new mongoose.Schema({
    name : String,
    headline : String,
    description : String,
    tmId: {type: mongoose.Schema.Types.ObjectId, ref: 'Users'},
    hostId: {type: mongoose.Schema.Types.ObjectId, ref: 'Users'},
    studentHostId: {type: mongoose.Schema.Types.ObjectId, ref: 'Users'},
    addRef: Number,
    space: String,
    phone: String,
    fullAddress: String,
    address: {
        street1: String,
        street2: String,
        country: String,
        state: String,
        city: String,
        zip: String
    },
    location: {
        type: {
            type: String,
            //required: true,
            enum: ["Point", "LineString", "Polygon"],
            default: "Point"
        }, 
        coordinates: [Number]
    },
    rate: Number,
    review: Array,
    note: String,
    profileImage: String, // This was being used for the banner image but not being used in new forms.
    keywords : Array,
    fees: {
        hourlyRate: Number,
        extraFee: String,
        extraFeeRate: Number,
        extraFeeReason: String,
        isGroupDiscount: String,
        groupDiscount: []
    },
    schedule: {}, // Main shcedule for the lesson.
    commonSchedule: {}, // This will store the common schedule found in all requests
    neighborhood : String,
    photos: Array,
    videos: Array,
    languages: Array,
    talent: String, // Now there will be only single talent in Lesson
    talentImage: String,
    category: String,
    categoryImage: String,
    grade: String,
    age: String,
    lessonImage: String, // If any image uploaded by user.
    lessonType: String, // If this is available type of lesson val 'AVAILABLE' OR 'NORMAL'
    // REQUESTED: new request, ACKNOWLEDGED: new request approved, DECLINED: if declined by tm, CLOSED: SUSPENDED: if suspended and closed manually or by date closed. ACTIVE: when active or runnning.
    // (REQUESTED, ACKNOWLEDGED, DRAFT, DECLINED, SUSPENDED, ACTIVE, COMPLETED (completed is also like CLOSED so no any other status like 'ClOSED')) 
    // PUBLISHED (newly added for the available lessons)
    status: String, 
    declineReason: String,
    totalSlot: Number,
    availableSlot: Number,
    parentWillingToHost: Boolean,
    students : [{
            requestId: String,
            parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Users'},
            student: { type: mongoose.Schema.Types.ObjectId, ref: 'Users'},
            parentemail: String,
            comment: String,
            isFlexible: Boolean,
            isWaitlist: Boolean,
            isGrandfatheringInvite: Boolean, // If invited member was the Grandfathered parent or not so that on join we can give the checkbox selection.
            isGrandfathering: Boolean, // If Grandfathering or not means it was existing student or not on old lesson
            parentWillingToHost: Boolean,
            requestedSchedule: {},
            requestedOn: Date,
            acceptedOn: Date,
            droppedOn: Date,
            currentStatus: String, // REQUESTED, ACCEPTED, DROPPED, INVITED, WAITLISTED
            freeTrailApplied: Boolean //true, false
        }],
    liketohost: Boolean,
    tempTnId: String,
    sessionOutline: String,
    sessionDuration: Number,
    numberOfSessions: Number,
    studentPerSession: Number,
    minStudentPerSession: Number,
    taughtLevel: [],
    isFreeTrial: String,
    policy: String,
    startDate: Date, // Lesson start date
    endDate: Date,  // Lesson end date
    launchedOn: Date, // LaunchedOn 
    lastClassOn: Date,
    lastSession: Date,
    totalSession: Number,
    isGrandfathering: Boolean, // If Grandfathering or not
    studentHostId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users'},
    totalViews: Number, //Total unique views 
    createdOn: Date,
    updatedOn: Date,
},{
  toObject: {
    virtuals: true
  },
  toJSON: {
    virtuals: true 
  }
});

// PRE POST START
Lessons.pre('save', function(next) {
    if (this.isNew) {
        // things that we don't need to apply only for new record (create or insert).
        this.totalSlot = this.totalSlot | this.studentPerSession | 0;
        this.studentPerSession = this.studentPerSession | 0;
        this.minStudentPerSession = this.minStudentPerSession | 0;
        this.availableSlot = this.availableSlot | this.studentPerSession | 0;
        this.registeredStudent = this.registeredStudent | 0;
        this.status = (this.status!='0' && !_.isEmpty(this.status))? this.status : 'REQUESTED';
        this.totalSession = 0;
        this.createdOn = new Date();
        this.isGrandfathering = this.isGrandfathering | false;
        this.lessonType = (this.lessonType && this.lessonType!="0" && this.lessonType!=0)? this.lessonType: 'NORMAL';
        this.totalViews = 0;
        // console.log("pre save this.status", this.status, this.lessonType);
    }else{
        this.totalSlot = this.totalSlot | 0;
        this.studentPerSession = this.studentPerSession | 0;
        this.minStudentPerSession = this.minStudentPerSession | 0;
        let countJoined = 0;
        for (var i = this.students.length - 1; i >= 0; i--) {
            // if(this.students[i].isJoined)
            if(this.students[i].currentStatus == 'ACCEPTED'){
                countJoined++;
            }
        }
        this.availableSlot = this.studentPerSession - countJoined;
    }
    next();
});
Lessons.pre('update', function(next) {
    this.totalSlot = this.totalSlot | 0;
    this.studentPerSession = this.studentPerSession | 0;
    this.minStudentPerSession = this.minStudentPerSession | 0;
    let countJoined = 0;
    if(this.students){
        for (var i = this.students.length - 1; i >= 0; i--) {
            // if(this.students[i].isJoined)
            if(this.students[i].currentStatus == 'ACCEPTED'){
                countJoined++;
            }
        }
        this.availableSlot = this.studentPerSession - countJoined;
    }

    this.update({},{ $set: { updatedOn: new Date() } });
    next();
});
// PRE POST FINISH


// VIRTUAL FIELD START
Lessons.virtual('total.waitlisted').get(function () {
    let total = 0;
    if(this.students){
        for (var i = this.students.length - 1; i >= 0; i--) {
            if(this.students[i].currentStatus == 'WAITLISTED'){
                total++;
            }
        }
    }
    return total;
});
Lessons.virtual('total.accepted').get(function () {
    let total = 0;
    if(this.students){
        for (var i = this.students.length - 1; i >= 0; i--) {
            if(this.students[i].currentStatus == 'ACCEPTED'){
                total++;
            }
        }
    }
    return total;
});
Lessons.virtual('total.requested').get(function () {
    let total = 0;
    if(this.students){
        for (var i = this.students.length - 1; i >= 0; i--) {
            if(this.students[i].currentStatus == 'REQUESTED'){
                total++;
            }
        }
    }
    return total;
});
Lessons.virtual('total.students').get(function () {
    let total = 0;
    if(this.students){
        for (var i = this.students.length - 1; i >= 0; i--) {
            if(this.students[i].currentStatus != 'DROPPED'){
                total++;
            }
        }
    }
    return total;
});
// VIRTUAL FIELD END

// ensure the geo location uses 2dsphere
Lessons.index({ location : "2dsphere" });
const Lesson = module.exports = mongoose.model( 'Lessons', Lessons );

// Retun Lesson by ID 
module.exports.getNookById = (id, callback) => {
    Lesson.findById(id, callback);
}   

// Get nook detail . 
// module.exports.getDetail = (tnid, callback)
module.exports.getDetail = (tnid) => {
    var deferred = Q.defer();

    const query = {_id: tnid};
    let self = Lesson;

    let aggregate_object = [];
    aggregate_object.push({ "$match": { _id: new MyObjectId(tnid) } });
    aggregate_object.push({ "$unwind": "$students" });
    // REQUESTED, ACCEPTED, DROPPED, INVITED, WAITLISTED
    aggregate_object.push({ "$addFields": { 
        "sortorder": {
            "$switch": {
               branches: [
                  { case: { $eq: ["$students.currentStatus", "REQUESTED"] }, then: 0 },
                  { case: { $eq: ["$students.currentStatus", "ACCEPTED"] }, then: 1 },
                  { case: { $eq: ["$students.currentStatus", "WAITLISTED"] }, then: 2 },
                  { case: { $eq: ["$students.currentStatus", "INVITED"] }, then: 3 },
                  { case: { $eq: ["$students.currentStatus", "DROPPED"] }, then: 4 },
               ],
               default: 5
            }
        }
    } });
    aggregate_object.push({ "$sort": { sortorder: 1}});
    aggregate_object.push({ "$lookup": 
            { 
                "from": "users",
                "localField": "students.student",
                "foreignField": "_id",
                "as": "students.student"
            }
        });    
    aggregate_object.push({ "$lookup": 
            { 
                "from": "users",
                "localField": "students.parent",
                "foreignField": "_id",
                "as": "students.parent"
            }
        });
    
    aggregate_object.push({ "$lookup": 
            { 
                "from": "users",
                "localField": "tmId",
                "foreignField": "_id",
                "as": "tmId"
            }
        });
    aggregate_object.push({ "$lookup": 
            { 
                "from": "users",
                "localField": "hostId",
                "foreignField": "_id",
                "as": "hostId"
            }
        });
    
    aggregate_object.push({ "$group": { _id: "$_id", "students": { "$push": "$students" }} });
    
    // console.log('aggregate_object',aggregate_object);    
    Lesson.aggregate(aggregate_object, (err, results, stats) => {
        if (err) {
            deferred.reject(err);
        } else {
            Lesson.findOne(query)
            // .populate('tmId hostId requests.parent requests.students._id studentHostId students.parent students.students._id', {password:0}) // <--
            .populate('tmId hostId studentHostId students.parent students.student', {password:0}) // <--
            .exec(function (err, data) {
                if (err) {
                    deferred.reject(err);
                }else {
                    if(results[0] && results[0].students){
                        data.students = results[0].students;
                    }
                    // console.log(data);
                    deferred.resolve(data);
                }
            });
        }
    });

    return deferred.promise;
}

// Get talent masters based on search . 
module.exports.getSearchedResult = (searchParam, cb) => { 
    var query = (searchParam.query && searchParam.query!='' && !_.isEmpty(searchParam.query))? searchParam.query : '';
    var page = (searchParam.page>0)? searchParam.page : 0;
    var hasTalent = (searchParam.query && !_.isEmpty(searchParam.query))? true : false;
    var nooks = [];
    var masters = [];
    var bestMatchLessons = [];
    var ongoingLessonsData, availableLessonsData, bestMatchLessonsData; 

    Q.fcall(() => {
        // console.log('SearchParam: ', searchParam);
        if(!_.isEmpty(query)){
            console.log('Tracking 1-1');
            return [Lesson.getLessons(searchParam), User.getTalentMasters(searchParam), []]; // In this caes we don't need to fetch best matched TM
            
        }else{
            console.log('Tracking 1-2');
            return [Lesson.getLessons(searchParam), User.getTalentMasters(searchParam), User.getBestMatchMasters(searchParam)];
            
        }
    }).spread((ongoingLessons, availableLessons, bestMatchLesson) => {
        ongoingLessonsData = ongoingLessons;
        availableLessonsData = availableLessons;
        bestMatchLessonsData = bestMatchLesson;

        if(!_.isEmpty(query)){
            console.log('Tracking 2-1');
            return [Lesson.getLessonsTalents(searchParam), User.getTalentMastersTalents(searchParam)];
            // return [];
        }else{
            console.log('Tracking 2-2');
            return [[],[]]; 
        }
    }).spread((lessonsFiltersData, availableFiltersData) => {
        console.log('lessonsFiltersData', lessonsFiltersData);
        console.log('availableFiltersData', availableFiltersData); // availableFiltersData
        cb(null, [ongoingLessonsData, availableLessonsData, bestMatchLessonsData, lessonsFiltersData, availableFiltersData]);
    }).catch((err) => {
        console.log('Tracking 3', err);
        // FAILURE
        console.log("ERROR in search: ",err);
        cb(err, null)
    });

};

module.exports.getSearchAggregateObject = (searchParam, forCountWithTalent) => {
    // CONVERTED INTO PROMISS
    var deferred = Q.defer();

    let lat = parseFloat(searchParam.lat);
    let lng = parseFloat(searchParam.lng);

    let page = parseFloat(searchParam.page);
    let limit = config.SEARCH_PAGE_LIMIT;
    let skip = (page>1)? page*limit: 0;
    let totalResult = 0;

    // TODO: We will make this dynamic from setting collection
    let distance = 3218.69; // 2 miles
    // if(config.DEBUG_MODE){
        // distance = 8046.72; // 5 miles
    // }
    // 3218.69; // Add 2 miles more if user is searched by zip code.
    let additinalMiles = 6437.38; // Add 4 miles more if user is searched by zip code.


    if(isNaN(lat) || isNaN(lng)){
        // cb("Please provide proper Geo Location data.", null);
        // console.log('Tracking 190');
        deferred.reject("Please provide proper Geo Location data.");
    }

    var groupFields = {
                        "_id": "$_id",
                        "name": { "$first": "$name"},
                        "headline": { "$first": "$headline"},
                        "description": { "$first": "$description"},
                        "tmId": { "$first": "$tmId"},
                        "hostId": { "$first": "$hostId"},
                        "fullAddress": { "$first": "$fullAddress"},
                        "address": { "$first": "$address"},
                        "location": { "$first": "$location"},
                        "rate": { "$first": "$rate"},
                        "fees": { "$first": "$fees"},
                        "schedule": { "$first": "$schedule"},
                        "talent": { "$first": "$talent"},
                        "status": { "$first": "$status"},
                        "totalSlot": { "$first": "$totalSlot"},
                        "availableSlot": { "$first": "$availableSlot"},
                        "lessonOutline": { "$first": "$lessonOutline"},
                        "lessonDuration": { "$first": "$lessonDuration"},
                        "numberOfLessons": { "$first": "$numberOfLessons"},
                        "studentPerLesson": { "$first": "$studentPerLesson"},
                        "taughtLevel": { "$first": "$taughtLevel"},
                        "isFreeTrial": { "$first": "$isFreeTrial"},
                        "policy": { "$first": "$policy"},
                        "startDate": { "$first": "$startDate"},
                        "endDate": { "$first": "$endDate"},
                        "launchedOn": { "$first": "$launchedOn"},
                        "lastClassOn": { "$first": "$lastClassOn"},
                        "lastLesson": { "$first": "$lastLesson"},
                        "totalLesson": { "$first": "$totalLesson"},
                        "isGrandfathering": { "$first": "$isGrandfathering"},
                        "createdOn": { "$first": "$createdOn"}
                    };

    try{
        let points = [lng,lat];
        let geo_json = { type : "Point", coordinates: points };

        // AVAILABLE SLOT
        if(searchParam.nearBy && searchParam.nearBy!=""){
            let hasGreaterThan = ( _.findIndex(searchParam.nearBy, function(o) { return o == ">=5"; }) != -1 )? true : false;
            if(hasGreaterThan){
                distance = 16093.44; // 10 miles more than 5 and less than 10
            }else{
                // Math.min.apply(null, this);
                let maxDistance = Math.max.apply(null, searchParam.nearBy) // 4
                if(maxDistance>=0){
                    distance = 1609.345*maxDistance;
                }
            }
        }

        if(searchParam.searchByZip){
            distance = distance + additinalMiles; // Add 4 miles more if user is searched by zip code.
        }
        // console.log('updated-distance', distance);

        let geo_options = { "near": geo_json, distanceField : "dis", limit:100, spherical : true, maxDistance: distance }; // Max two miles from current/searchedzip lat long.    
        let aggregate_object = [];

        aggregate_object.push({ "$geoNear": geo_options });

        // ONLY ACTIVE STATUS TALENTNOOK WILL BE AVAILABLE
        // aggregate_object.push({ "$match": { "status" : "ACTIVE" } }); // REQUESTED, CLOSED, INACTIVE, CANCLLED etc.
        aggregate_object.push({ "$match": { "$or": [{ "status" : "ACTIVE" }, { "status" : "ACKNOWLEDGED"}] } }); // ENABLED "ACKNOWLEDGED" AS WELL FOR SEARCHING.
        aggregate_object.push({ "$match": { "tmId": {"$ne":""}}});

        if(searchParam.query){
            let search_val = new RegExp(searchParam.query,"i");
            // aggregate_object.push({ "$match": { "name" : search_val } });

            // In future we can have this feature to look into keywords to make search more appropriate.
            // aggregate_object.push({ "$match": { "$or": [{ "name" : search_val }, { keywords : { $in: [search_val] }}] }});
            
            // Now we are saving talent single value in all talentnook.
            // aggregate_object.push({ "$match": { "$or": [{ "name" : search_val }, { "talent" : search_val}] }});
            aggregate_object.push({ "$match": { "talent" : search_val} });
        }

        // ADVANCE SEARCH OPTIONS
        // TAUGHT LEVEL (BEGINNER, ADVANCED OR INTERMDDIATE)
        if(searchParam.taughtLevel && searchParam.taughtLevel!=""){
            if(searchParam.taughtLevel.length>0){
                let allLevel = _.findIndex(searchParam.taughtLevel, function(data) { return data == 'all_level'; });
                if(allLevel!=-1){
                    aggregate_object.push({ "$match": { taughtLevel: { $all: [ "Beginner", "Intermediate", "Advanced" ] }} });
                }else{
                    aggregate_object.push({ "$match": { taughtLevel: { $in: searchParam.taughtLevel }} });
                }
                // console.log("allValues", allValues);
            }
        }
        // AVAILABLE SLOT
        if(searchParam.availableSlot && searchParam.availableSlot!=""){
            aggregate_object.push({ "$match": { availableSlot: { $gte: 1 }} });
        }
        // FREE TRIAL CLASS FACILITY
        if(searchParam.freeTrial && searchParam.freeTrial!=""){
            aggregate_object.push({ "$match": { isFreeTrial: { $eq: "Yes" }} });
        }
        // IF DAY AND TIME BOTH APPLIED
        if(searchParam.day && searchParam.day!="" && searchParam.time && searchParam.time!=""){
            let query = CommonModel.getDayAndTimeQuery(searchParam.day, searchParam.time, false); // No user model so last param is false
            aggregate_object.push({ "$match": query });
            // console.log("day time query ", JSON.stringify(query));
        }else if(searchParam.day && searchParam.day!="" && (!searchParam.time || searchParam.time=="")){
            // IF ONLY DAY APPLIED
            let query = CommonModel.getDayAndTimeQuery(searchParam.day, [], false); // No user model so last param is false
            aggregate_object.push({ "$match": query });
            // console.log("only day query ", JSON.stringify(query));
        }else if(searchParam.time && searchParam.time!="" && (!searchParam.day || searchParam.day=="")){
            // IF ONLY TIME APPLIED
            let query = CommonModel.getDayAndTimeQuery([], searchParam.time, false); // No user model so last param is false
            aggregate_object.push({ "$match": query });
            // console.log("only time query ", JSON.stringify(query));
        }
        // PRICE RANGE
        if(searchParam.price && searchParam.price!=""){
            let orQuery = {"$or": []};
            
            for (var i = searchParam.price.length - 1; i >= 0; i--) {
                let temp = searchParam.price[i].split("&");
                let subquery = {};
                if(temp.length>1){
                    try{
                        let minval = parseInt(temp[0]);
                        let maxval = parseInt(temp[1]);
                        
                        if(minval>=0 && maxval>=0){
                            // {"fees.hourlyRate": $gte:  }
                            subquery = {"fees.hourlyRate": {"$gte": minval, "$lte": maxval}};
                        }else if(minval>=0){
                            subquery = {"fees.hourlyRate": {$lte: minval}};
                        }else if(maxval>=0){
                            subquery = {"fees.hourlyRate": {$lte: minval}};
                        }
                        if(subquery!={}){
                            orQuery["$or"].push(subquery);
                        }
                    }catch(e){
                        // if there is any issue with data then no need to create query
                        console.log("Error and price filter");
                    }
                }else{
                    let minval = parseInt(temp[0]);
                    subquery = {"fees.hourlyRate": {$lte: minval}};
                }
            }
            if(orQuery["$or"]!=[]){
                aggregate_object.push({ "$match": orQuery });
            }
            console.log("price query ", JSON.stringify(orQuery));
        }
        // ADVANCE SEARCH OPTIONS

        // IF SORTING APPLIED
        switch(searchParam.sortBy && !forCountWithTalent){
            case 'rate':
                aggregate_object.push({ "$sort": {"rate" : -1} });
            break;
            case 'price_high_to_low':
                aggregate_object.push({ "$sort": {"fees.hourlyRate" : -1} });
            break;
            case 'price_low_to_high':
                aggregate_object.push({ "$sort": {"fees.hourlyRate" : 1} });
            break;
            case 'createdOn':
                aggregate_object.push({ "$sort": {"createdOn" : -1} });
            break;
            case 'totalViews':
                aggregate_object.push({ "$sort": {"totalViews" : -1} });
            break;

            default:
                aggregate_object.push({ "$sort": {"dis" : -1} });
            break;
        }
        
        // Always populate the tmId
        if(!forCountWithTalent){
            aggregate_object.push({ "$lookup": { "from": "users", "localField": "tmId", "foreignField": "_id", "as": "tmId"} });
        }

        deferred.resolve(aggregate_object);
        // console.log('points', points);
        // let debug = JSON.stringify(aggregate_object);
    }catch(e){
        console.log('ERROR in search ongoing lessions 2: ', e.toString());
        // cb("Please provide proper Geo data.", null);
        deferred.reject(e.toString());
    }
    return deferred.promise;
}

// Get talent nooks based on search . 
module.exports.getLessons = (searchParam, cb) => {
    // CONVERTED INTO PROMISS
    var deferred = Q.defer();
    let page = parseFloat(searchParam.page);
    let limit = config.SEARCH_PAGE_LIMIT;
    let skip = (page>1)? page*limit: 0;
    let totalResult = 0;
    let aggregate_object;

    try{
        // let aggregate_object = self.getSearchAggregateObject(searchParam, false);
        // let debug = JSON.stringify(aggregate_object);
        // console.log('Ongoing aggregate_object', aggregate_object, JSON.stringify(aggregate_object));

        Q.fcall(() => {
            return Lesson.getSearchAggregateObject(searchParam, false);
        }).then((aggregateObject) => {
            aggregate_object = aggregateObject;
            // let debug = JSON.stringify(aggregate_object);
            console.log('Ongoing aggregate_object', aggregate_object, JSON.stringify(aggregate_object));
            let cloneAggregateObject = _.clone(aggregate_object);
            cloneAggregateObject.push({ $count: "name" });
            return Lesson.aggregate(cloneAggregateObject);
        }).then((resultsCount) => {
            // console.log('resultsCount', resultsCount);
            if(resultsCount && resultsCount[0] && resultsCount[0].name){
                totalResult = resultsCount[0].name;
            }

            // If skip applicable applied.
            if (skip > 0 ) {
                aggregate_object.push({ "$skip": skip});
            }
            // If skip applicable applied.
            if (limit > 0 ) {
                aggregate_object.push({ "$limit": limit});
            }
            return Lesson.aggregate(aggregate_object);
        }).then((results) => {
            // console.log('results aggregate_object', totalResult, aggregate_object);
            // console.log('Lesson.aggregate results', results);
            if (results) {
                // return User.populate(results, {path: 'tmId'});  
                return results;
            } else {
                // cb("Please provide proper Geo data."+err, null);
                // throw "Please provide proper Geo data.";
                return [];
            }
        }).then((results) => {
            deferred.resolve({ongoingLessons: results, totalOngoing: totalResult});
        }).catch((err) => {
            // FAILURE
            console.log("ERROR in search ongoing lessions 1: ",err);
            deferred.reject(err);
        });

    }catch(e){
        console.log('ERROR in search ongoing lessions 2: ', e.toString());
        // cb("Please provide proper Geo data.", null);
        deferred.reject(e.toString());
    }

    return deferred.promise;
}

// Get talent nooks based on search . 
module.exports.getLessonsTalents = (searchParam, cb) => {
    // CONVERTED INTO PROMISS
    var deferred = Q.defer();
    let aggregate_object;

    try{

        Q.fcall(() => {
            return Lesson.getSearchAggregateObject(searchParam, true);
        }).then((aggregateObject) => {
            aggregate_object = aggregateObject;
            // let debug = JSON.stringify(aggregate_object);
            // console.log('Ongoing aggregate_object', aggregate_object, JSON.stringify(aggregate_object));
            let cloneAggregateObject = _.clone(aggregate_object);
            cloneAggregateObject.push({ $group: {"_id": "$talent", "totalRecord": { "$sum": 1 }, "talentName": { "$last": "$talent"} }  });
            return Lesson.aggregate(cloneAggregateObject);
        }).then((results) => {
            console.log('Lesson.aggregate results', results);
            deferred.resolve({lessonsFiltersData: results});
        }).catch((err) => {
            // FAILURE
            console.log("ERROR in search ongoing lessions 1: ",err);
            deferred.reject(err);
        });
    }catch(e){
        console.log('ERROR in search ongoing lessions 2: ', e.toString());
        // cb("Please provide proper Geo data.", null);
        deferred.reject(e.toString());
    }

    return deferred.promise;
}



// Get all talent nooks for admin lesson grid. 
module.exports.getList = (req, next)  => {
    var Invoice = require('../models/invoices');

    let self = Lesson;
    let filter = {};
    let skip = 0;
    let limit = 10;
    let match = {};

    if(req.body.tmId){
        filter['tmId'] = req.body.tmId;
        // filter["$or"] = [ {"tmId": req.body.tmId},{"hostId": req.body.hostId}];
    }else if(req.body.parentId){
        // filter['hostId'] = req.body.parentId;
        // filter["$or"] = [ {"hostId": req.body.parentId}, {"requests" : { $elemMatch: {"parent": req.body.parentId}}}];
        filter["students"] = { $elemMatch: {"parent": req.body.parentId}};
        match = {"paymentStatus": 'INVOICED', "student.parentId": new MyObjectId(req.body.parentId)};
    }
    filter["status"] = {"$ne": ""};
   
    console.log('filter : ',filter);
    Q.fcall(() => {
        let scQry = self.find(filter);
        if (req.body.rows) {
            scQry.limit((req.body.rows)? req.body.rows : self.limit);
            // scQry.populate("domainId", 'content');
        }
        
        if (req.body.first) {
            scQry.skip((req.body.first)? req.body.first : self.skip);
        }

        // For sorting
        if (req.body.sortOrder && req.body.sortField) {
            let sortqry = {[req.body.sortField]: req.body.sortOrder};
            scQry.sort(sortqry);
        } else {
            scQry.sort({_id: -1});
        }
        // scQry.populate("tmId hostId requests.parent")
        scQry.populate("tmId hostId studentHostId students.parent students.student")
        // return next('', {data: [], totalrecord: 10});
        return scQry;
    })
    .then(depData => {
        return [
            depData,
            ((req.body.rows) ? self.count(filter) : depData.length) //get total records
        ]
    })
    .spread((data, count) => {
        //console.log('match: ',match);
        return [data, count, Invoice.aggregate(
            {
                "$match": match
            },
            {
                "$group": {
                    _id: "$tnId",
                    paymentAmount: { 
                        "$sum": "$paymentAmount" 
                    }
                }
            }
        )];
    })
    .spread((data, count, pmSummary) => {
        //console.log("data: ", data, "count: ",count, "pmSummary: ", pmSummary);
        return next('', {data: data, totalrecord: count, pmSummary: pmSummary});
    })
    .catch(err => {
        next(err)
    });
}

// Save a new talent nook 
module.exports.saveLesson = (req, callback) => {
    // console.log(req.body);
    let hostId = (req.body.hostId)? req.body.hostId : '';
    let userId = req.user._id;
    let tnId = req.body._id;

    let dataobj = req.body;
    dataobj.tmId = new MyObjectId(userId); // Because that is object for relation
    
    // If Grandfathering
    if(req.body.isGrandfathering){
        dataobj.isGrandfathering = req.body.isGrandfathering;
    }

    // To save the image if uploaded.
    if(req.body.formName=="tnFormBannerRemove"){
        dataobj.profileImage = '';
    }else if(req.body.formName=="tnFormBanner"){
        dataobj.profileImage = req.body.bannerImage;
    }else if((req.body.formName=="launch" || req.body.formName=="launchLater") && !_.isEmpty(req.body.bannerImage)){
        // In case user saving draft then banner image will be posted with the other data
        dataobj.profileImage = req.body.bannerImage;        
    }

    if(req.body.formName=="launch"){
        // If Grandfathering then need to ACKNOWLEDGED automatically on launch.
        if(req.body.isGrandfathering){
            dataobj.status = 'ACKNOWLEDGED';
        }else{
            dataobj.launchedOn = new Date();
            dataobj.status = 'ACTIVE';
        }
    }

    // This will be completely functional when we will have the feature to udpate the host in front end.
    /*if(req.body.liketohost && _.isEmpty(req.body.hostId)){
        dataobj.hostId = new MyObjectId(userId);
        hostId = userId;
    }else if(!_.isEmpty(req.body.hostId)){
        dataobj.hostId = new MyObjectId(hostId);
        dataobj.liketohost = true;
    }*/

    // Now there will be no option to assign the host.
    /*if(!_.isEmpty(req.body.hostId)){
        dataobj.hostId = new MyObjectId(hostId);
        dataobj.liketohost = true;
    }*/


    if(_.isEmpty(tnId)){
        // Create
        delete dataobj._id;

        return Q.fcall(() => {
            // return User.findOne({_id: hostId});
            if(hostId!=''){
                return [User.findOne({_id: userId}),User.findOne({_id: hostId})];
            }else{
                return [User.findOne({_id: userId}),{}];
            }
        }).spread( (tmuser, hostuser) => {
            // TO SETUP INITIAL DATA FROM TALENTMASTER ON CREATE FIRST TIME.
            //We don't need to set tm schedule for tn profiles.
            /*if(req.body.formName!="tmFormSchedule"){
                dataobj.schedule = user.tm.schedule;
            }*/

            if(req.body.formName!="tmFormSkill" && req.body.formName!="launch"){
                dataobj.talent = tmuser.tm.talent;
            }
            if(req.body.formName!="tmFormFees" && req.body.formName!="launch"){
                dataobj.fees = tmuser.tm.fees;
            }
            if(req.body.formName!="tmFormSessionDetail" && req.body.formName!="launch"){
                dataobj.sessionDuration = tmuser.tm.sessionDuration;
                dataobj.studentPerSession = tmuser.tm.studentPerSession;
                dataobj.minStudentPerSession = tmuser.tm.minStudentPerSession;
                dataobj.totalSlot = tmuser.tm.studentPerSession;
                dataobj.isFreeTrial = tmuser.tm.isFreeTrial;
                // dataobj.travelradius = tmuser.tm.travelradius;
                dataobj.taughtLevel = tmuser.tm.taughtLevel;
            }
            if(req.body.formName!="tmFormPolicy" && req.body.formName!="launch"){
                dataobj.policy = tmuser.tm.policy;
            }
            if(req.body.formName!="tmFormLanguage" && req.body.formName!="launch"){
                dataobj.languages = tmuser.tm.languages;
            }
            if(req.body.formName!="tnFormNoofSlot" && req.body.formName!="launch"){
                dataobj.totalSlot = tmuser.tm.studentPerSession;
            }   

            // By default user who is going to host we will use his location and address for that user
            if(hostuser && hostuser.address && hostuser.location){
                dataobj.fullAddress = hostuser.fullAddress;
                dataobj.address = hostuser.address;
                dataobj.location = hostuser.location;
            }else{
                dataobj.fullAddress = tmuser.fullAddress;
                dataobj.address = tmuser.address;
                dataobj.location = tmuser.location;
            }

            delete dataobj.formName;
            Lesson.create(dataobj, function (err, modelObj) {
                if (err) {
                  // console.log(" Error in insert ",err.toString());
                  return callback({ err: 1, msg: err.toString(), data: {} });
                } else {
                    // UPDATE USER COUNTS IF ANY ONE CREATE ANY NEW TALENTNOOK
                    Lesson.updateStudentCounts(modelObj._id)
                    .then((result)=>{
                        // console.log('success updateStudentCounts', result);
                        console.log('success updateStudentCounts');
                    }).catch((err)=>{
                        console.log('err in updateStudentCounts',err);
                    });

                    
                    let query = {_id: modelObj._id};
                    // return callback({err: 0, msg:'', data: modelObj});
                    Lesson.findOne(query).populate('tmId').exec( function (err, dataObj) {
                        if (err) {
                            return callback({ err: 1, msg: err.toString(), data: {} });
                        }else {
                            return callback({err: 0, msg:'', data: dataObj});
                        }
                    });
                }
            });        
        }).catch(err => {
            return callback({err: err, msg: err.toString(), data: {}});
        });
        
    }else{
        // Update
        let query = { _id: req.body._id, tmId: userId };
        return Q.fcall(() => {
            // console.log('Lesson', Lesson);
            return Lesson.findOne(query);
        }).then( (lesson) => {
            if(hostId!=''){
                return [lesson, User.findOne({_id: userId}), User.findOne({_id: hostId})];
            }else{
                return [lesson, User.findOne({_id: userId}),{}];
            }
        }).spread( (lesson, tmuser, hostuser) => {
            // TODO: Need to check if host is updated or not if not thne we don't need to update address,fulladdress and location
            // By default user who is going to host we will use his location and address for that user
            // Because we don't have facility to change host on this page host related data address or locaation will not be updated here.
            /*dataobj.fullAddress = hostuser.fullAddress;
            dataobj.address = hostuser.address;
            dataobj.location = hostuser.location;*/

            // If save and finish later then we don't need to modify the status DRAFT, then it will be what it was 
            // other wise requested or acknoledged may be draft that should not be.
            if(req.body.formName=="launchLater"){
                // dataobj.status = lesson.status;
                dataobj.status = 'DRAFT';
            }

            if(dataobj.studentPerSession){
                dataobj.totalSlot = dataobj.studentPerSession;
            }

            delete dataobj.formName;
            Lesson.findOneAndUpdate(query, dataobj, {new:true}).populate('tmId').exec( function (err, modelObj) {
                if (err) {
                    return callback({ err: 1, msg: err.toString(), data: {} });
                }else {
                    // UPDATE USER COUNTS IF ANY ONE CREATE ANY NEW TALENTNOOK
                    Lesson.updateStudentCounts(modelObj._id)
                    .then((result)=>{
                        // console.log('success updateStudentCounts', result);
                        console.log('success updateStudentCounts');
                    }).catch((err)=>{
                        console.log('err in updateStudentCounts',err);
                    });

                    // Remove image physically
                    if(req.body.formName=='tnFormBannerRemove'){
                        try{
                            let filename = req.body.bannerImage;
                            let upload_dir = `${config.ASSETS}/${config.TN_BANNERS}/`;
                            let filePath = `${upload_dir}${filename}`;
                            fs.unlinkSync(filePath);

                            console.log("Banner image deleted", req.body.bannerImage);
                        }catch(e){
                            console.log("Banner image was not deleted", req.body.bannerImage);
                        }
                    }
                    return callback({err: 0, msg:'', data: modelObj});
                }
            });
        }).catch(err => {
            return callback({err: err, msg: err.toString(), data: {}});
        });
    }
}

// Save a new talent nook or update existing one.
module.exports.saveLessonDetail = (req, callback) => {
    console.log('req.body', req.body);
    let hostId = (req.body.hostId)? req.body.hostId : req.user._id;
    let userId = req.user._id;
    let tnId = req.body._id;
    let resetParentHostId = null;
    let requestedStudent = [];

    let dataobj = req.body;
    dataobj.requestData = {};
    // To save the image if uploaded.    

    if(!_.isEmpty(tnId)){
        let query = {_id: tnId};
        let self = Lesson;

        return Q.fcall(() => {
            return User.findOne({_id: hostId});
        }).then(hostUser => {
            return [hostUser, self.findOne(query).populate('tmId hostId studentHostId students.parent students.student', {password:0})];
            // return [hostUser, self.findOne(query)];
        }).spread( (hostUser, lesson) => { 
            // TODO: Need to check if host is updated or not if not then we don't need to update address,fulladdress and location
            // By default user who is going to host we will use his location and address for that user
            console.log('req.body.formName', req.body.formName);

            if(req.body.formName=="tmFormSessionDetail"){
                dataobj.totalSlot = dataobj.studentPerSession; // There is no any such use of this, becaues we are using studentPerSession for calculation

                return [hostUser, lesson, dataobj];
            }else if(req.body.formName=="tnHostDetail"){
                dataobj.hostId = hostUser._id;
                // This will be defined only if parent will be marked as host (not when make me host).
                if(req.body.studentHostId && !_.isEmpty(req.body.studentHostId)){
                    dataobj.studentHostId = req.body.studentHostId;
                }else{
                    dataobj.studentHostId = null;
                }
                dataobj.fullAddress = hostUser.fullAddress;
                dataobj.address = hostUser.address;
                dataobj.location = hostUser.location;

                return [hostUser, lesson, dataobj];
            }else if(req.body.formName=="tnAacceptDeclineForm"){
                if(req.body.acceptDecline==false){
                    dataobj.status = 'DECLINED';
                    dataobj.declineReason = req.body.declineReason;
                    dataobj.requestData = lesson.students[0];
                }else if(req.body.acceptDecline){
                    dataobj.status = 'ACTIVE';
                    dataobj.launchedOn = new Date();
                }else{
                    dataobj.status = lesson.status;
                }

                // TESTING CODE
                /*dataobj.status = lesson.status;
                self.updateSessionCounts(lesson._id)
                .then((result)=>{
                    console.log('success updateSessionCounts', result);
                }).catch((err)=>{
                    console.log('err in updateSessionCounts',err.toString());
                });
                Session.createUpcomingSession(lesson._id, false)
                .then((createdSession) => {
                    console.log('createUpcomingSession done', createdSession.err, createdSession.data);
                });*/
                // TESTING CODE

                return [hostUser, lesson, dataobj];
            }else if(req.body.formName=="tnOperationActionForm"){
                if(req.body.action=='mark_complete'){
                    dataobj.status = 'COMPLETED';
                }else if(req.body.action=='suspend'){
                    dataobj.status = 'SUSPENDED';
                }else if(req.body.action=='activate'){
                    dataobj.status = 'ACTIVE';
                }

                return [hostUser, lesson, dataobj];
            }else if(req.body.formName=="tnAcknowledgeForm"){
                if(req.body.isAacknowledged==true){
                    dataobj.status = 'ACKNOWLEDGED';
                }else{
                    dataobj.status = lesson.status;
                }

                return [hostUser, lesson, dataobj];
            }else if(req.body.formName=="tnPickedSchedule"){
                if(req.body.schedule){
                    dataobj.schedule = req.body.schedule;
                }

                return [hostUser, lesson, dataobj];
            }else if(req.body.formName=="tnUpdateSchedule"){
                let clonedScheduledData = {schedule: _.clone(dataobj.requestSchedule)};
                if(req.body.requestSchedule && req.body.requestSchedule.schedule && req.body.requestId && lesson.students){
                    for (var i = 0; i < lesson.students.length ; i++) {
                        if(lesson.students[i].requestId == req.body.requestId){
                            dataobj["students."+i+".requestedSchedule"] =  req.body.requestSchedule.schedule;
                        }
                    }
                }

                delete dataobj.schedule;
                delete dataobj.requestSchedule;
                delete dataobj.requestId;

                console.log(req.body.formName + ' requestSchedule dataobj ', dataobj);
                return [hostUser, lesson, dataobj];
            }else{

                return [hostUser, lesson, dataobj];
            }
        }).spread((hostUser, lesson, dataobj) => {
            delete dataobj._id;
            // console.log('hostUser._id, lesson._id, dataobj', hostUser._id, lesson._id, dataobj);

            if(req.body.formName=="tnChangeHostDetail"){
                console.log('req.user, hostUser, lesson', req.user, hostUser, lesson);
                // Send change host request to admin
                CommonModel.sendChangeHostRequest(req.user, hostUser, lesson, function(){
                    console.log('sendChangeHostRequest complete');
                });

                return [lesson,dataobj, null];
            }else if(req.body.formName=="tnRequestAcceptRejectForm"){
                // console.log('final data to update spread tnRequestAcceptRejectForm ', dataobj);
                let newquery = {_id: tnId, students: { $elemMatch: { requestId: { $in: req.body.requestIds } } } };
                //Session student status will also update when accept or drop
                let sessionQuery = {tnId: tnId, students: { $elemMatch: { requestId: { $in: req.body.requestIds } } } };
                //console.log("sessionQuery: ",sessionQuery, "req.body.requestIds: ", req.body.requestIds);
                
                let status = (req.body.isAccept)? 'ACCEPTED' : 'DROPPED';
                let updateObject = {};
                let parentEmails = [];
                let requestData = [];

                for (var i = lesson.students.length - 1; i >= 0; i--) {
                    if(_.indexOf(req.body.requestIds, lesson.students[i].requestId) >= 0 ){
                        if(status=='DROPPED'){ 
                            updateObject["students."+i+".droppedOn"] =  new Date();

                            if(lesson.hostId && lesson.hostId._id && lesson.hostId._id.toString() == lesson.students[i].parent._id.toString() && lesson.studentHostId._id.toString()==lesson.students[i].student._id.toString()){
                                dataobj.studentHostId = null;
                                resetParentHostId = lesson.students[i].parent._id;
                            }
                        }else{
                            updateObject["students."+i+".acceptedOn"] =  new Date();
                        }
                        updateObject["students."+i+".currentStatus"] =  status;

                        parentEmails.push(lesson.students[i].parent.email);
                        requestData.push({student: lesson.students[i].student, parent: lesson.students[i].parent});
                        // Keep request id so that same kind of changes can be done in all future sessions.
                        requestedStudent.push(lesson.students[i]);
                    }
                }

                // If request is dropped and dropped by tm
                if(!req.body.isAccept && req.body.viewMode=='TM'){
                    CommonModel.sendDeclinedEmailToParticulars(parentEmails, lesson.tmId,  function(result) {
                        console.log('success sendDeclinedEmailToParticulars', result);
                    });
                }
                
                dataobj.requestData = requestData;
                // Session.updateStudentStatus to update all the scheduled and upcoming sessions that needs to be processed.
                return [self.findOneAndUpdate( query , updateObject, {new:true}), dataobj, Session.updateStudentStatus(lesson,status,requestedStudent)];
            }else{
                
                return [self.findOneAndUpdate( query , dataobj, {new:true}), dataobj, null];
            }
            // return callback({err: 0, msg:'', data: lesson});
        }).spread( (tnObject, dataobj, sessionObject) => {

            return [Lesson.getDetail(tnObject._id),dataobj];
        }).spread( (data, dataobj) => {
            // There are many process according to updated information so need to trigger them.
            self.triggerBackendProcess(req, data, dataobj, dataobj.requestData);

            console.log('before updateStudentHost',resetParentHostId, data._id, dataobj._id);
            if(resetParentHostId && !_.isEmpty(resetParentHostId) && data){
                self.updateStudentHost(resetParentHostId, data);
            }

            //Stroe data in TN cash for refund case
            if(dataobj.status == 'SUSPENDED' || dataobj.status == 'COMPLETED'){
                TnCash.addRefundAmount(data);                              
            }

            return callback({err: 0, msg:'', data: data});
        }).catch(err => {
            console.log('final data to update error ',err.toString());
            return callback({err: err, msg: err.toString(), data: {}});
        });
    }else{
        return callback({err: 1, msg: "Invalid data sent", data: {}});
    }
}
module.exports.triggerBackendProcess = (req,lesson,dataobj={},additionalParams={}) => {
    // console.log('triggerBackendProcess', req.body.formName, additionalParams);

    // TODO: Trigger message for boardmessage
    let msgdata = {};
    let msg = "";
    let sysUserQuery = {role: {$in: ['SYSTEM_USER']}};

    switch(req.body.formName){
        case "tnChangeHostDetail":
            // HOST_CHANGE_REQUESTED / Sender => System
            // <TM First Name, Last Initial.> has requested to change the host. 
            // If any body reqeust to change host.
            CommonModel.sendChangeHostRequest(req.user, lesson.hostId, lesson, function(){
                console.log('sendChangeHostRequest complete');
            });
            // msg = "New request has been sent to Administrator to change host.";
            // msg = __('{{TMNAME}} has requested to change the host.', { TMNAME: CommonModel.name(lesson.tmId.fname,lesson.tmId.lname) });
            msg = req.__('{{USERNAME}} has requested to change the host.', { USERNAME: CommonModel.name(req.user.fname,req.user.lname) });            
            // msgdata = {sender: lesson.tmId._id, reciever: null, tnId: lesson._id, message: msg, type: "PUBLIC", triggerEvent: true};            
            
            User.findOne(sysUserQuery,function(err,objectData){
                if(!err){
                    msgdata = {sender: objectData._id, reciever: null, tnId: lesson._id, message: msg, isAutomessage: true, type: "PUBLIC", triggerEvent: true};            
                    BoardMessage.saveMessageInDatabase(msgdata)
                    .then( (boardmessage)=> {
                        console.log('boardmessage saved');
                    })
                    .catch( (err)=> {
                        console.log('boardmessage error',err);
                    });
                }
            });
        break;

        case "tnRequestAcceptRejectForm":
            // If tm accept drop any request/s

            // UPDATE STUDENTS COUNT IF ACCEPT DECLINED ON REQUESTES.
            Lesson.updateStudentCounts(lesson._id)
            .then((result)=>{
                // console.log('success updateStudentCounts', result);
                console.log('success updateStudentCounts');
            }).catch((err)=>{
                console.log('err in updateStudentCounts',err);
            });

            // TODO: If multiple student then consider accordingly and if single then consider accordingly.
            // console.log('lesson.tmId._id',lesson.tmId);
            if(additionalParams && additionalParams.length>0){
                var senderId = lesson.tmId._id;
                // console.log('senderId lesson.tmId._id ', senderId, lesson.tmId._id);
                for (var i = additionalParams.length - 1; i >= 0; i--) {
                    if(req.body.isAccept){
                        // STUDENT_ADDED / Sender => TM
                        // A new student has joined. Please welcome <First Name, Last Initial>.
                        msg = req.__('A new student has joined. Please welcome {{USERNAME}}.', { USERNAME: CommonModel.name(additionalParams[i].student.fname,additionalParams[i].student.lname) });
                        // msg = "New member added in Lesson, please check student list.";
                    }else{
                        // STUDENT_REMOVED / Sender => TM
                        // <First Name, Last Initial> has dropped.
                        msg = req.__('{{USERNAME}} has dropped.', { USERNAME: CommonModel.name(additionalParams[i].student.fname,additionalParams[i].student.lname) });
                        // msg = "Some member removed from Lesson, please check student list.";
                    }

                    msgdata = {sender: senderId, reciever: null, tnId: lesson._id, message: msg, isAutomessage: true, type: "PUBLIC", triggerEvent: true};            
                    BoardMessage.saveMessageInDatabase(msgdata)
                    .then( (boardmessage)=> {
                        console.log('boardmessage saved');
                    })
                    .catch( (err)=> {
                        console.log('boardmessage error',err);
                    });
                }
            }
        break;

        case "tnAacceptDeclineForm":
            // TRIGGER EMAIL SENDING IN BACKGROUND FOR ALL PARENTS AND STUDENTS.
            if(dataobj.status && dataobj.status == 'DECLINED'){
                // console.log("Cancellation emails initiated.");
                CommonModel.sendDeclinedEmailToAll(lesson, function(){
                    console.log("Cancellation emails sent successfully.");
                });
                // REQUEST_DECLINED / Sender => System
                // Your request was not accepted by <TM First Name>.
                // Inbox (based on my understanding of this line)
                msg = req.__('Your request was not accepted by {{USERNAME}}.', { USERNAME: CommonModel.name(lesson.tmId.fname,lesson.tmId.lname) });
                // msg = "Sorry, Lesson request is declined by Talentmaster.";
                // TODO: THIS WILL BE SENT IN PRIVATE MESSAGE INSTEAD OF MESSAGE BOARD.
                recievers = additionalParams.parent;
                // console.log('recievers msg', recievers, msg, lesson.students[0].parent);
                CommonModel.sendPrivateMessage(msg, 'SYSTEM_USER', recievers, "", "", function(){
                    console.log("sendPrivateMessage on declined request.");
                })
            }

            // TRIGGER UPCOMING LESSON CREAT PROCESS AND UPDATE TOTAL OR COUNT FOR LESSSONS.
            if(dataobj.status && dataobj.status == 'ACTIVE'){
                // dateTime false if not decided.
                //Session.createUpcomingSession(lesson._id, false, 'SCHEDULED')
                Session.addLaunchSessions(req, lesson._id)
                .then((createdSession) => {
                    //console.log("createdSession: ", createdSession.data);
                    // TALENTNOOK_LAUNCHED / Sender => Tm
                    // We are all set. First session will be on Jan 27, 2018. (First session date)
                    msg = req.__('We are all set. First session will be on {{LESSONDATE}}.', { LESSONDATE: CommonModel.date(createdSession.data.schedule.start) });

                    msgdata = {sender: lesson.tmId._id, reciever: null, tnId: lesson._id, message: msg, isAutomessage: true, type: "PUBLIC", triggerEvent: true};
                    BoardMessage.saveMessageInDatabase(msgdata)
                    .then( (boardmessage)=> {
                        console.log('boardmessage saved');
                    })
                    .catch( (err)=> {
                        console.log('boardmessage error',err);
                    });

                }).catch((err)=>{
                    console.log('err in createUpcomingSession',err);
                });
            }            
        break;

        case "tnHostDetail":
            // UPDATE USER COUNTS IF ANY ONE ADDED AS HOST
            if(dataobj.hostId != ''){
                Lesson.updateCountsForUsers(dataobj.hostId);
            }
            // HOST_CHANGED / Sender => System
            // <Member First Name, Last Initial.> has been assigned as the new host.
            msg = req.__('{{USERNAME}} has been assigned as the new host.', { USERNAME: CommonModel.name(lesson.hostId.fname,lesson.hostId.lname) });
            // msg = "Host is changed, please check host section.";

            // msgdata = {sender: lesson.tmId._id, reciever: null, tnId: lesson._id, message: msg, type: "PUBLIC", triggerEvent: true};
            
            User.findOne(sysUserQuery,function(err,objectData){
                if(!err){
                    msgdata = {sender: objectData._id, reciever: null, tnId: lesson._id, message: msg, isAutomessage: true, type: "PUBLIC", triggerEvent: true};
                    BoardMessage.saveMessageInDatabase(msgdata)
                    .then( (boardmessage)=> {
                        console.log('boardmessage saved');
                    })
                    .catch( (err)=> {
                        console.log('boardmessage error',err);
                    });
                }
            });
        break;

        case "tnPickedSchedule":
            // SCHEDULE_UPDATED / TM
            // Hi Parents! I have updated the schedule. Please let me know if you have any questions.

            // If tm picked schedule            
            msg = req.__('Hi Parents! I have updated the schedule. Please let me know if you have any questions.');
            // msg = "Schedule has been updated please check updated schedule.";
            msgdata = {sender: lesson.tmId._id, reciever: null, tnId: lesson._id, message: msg, isAutomessage: true, type: "PUBLIC", triggerEvent: true};
            BoardMessage.saveMessageInDatabase(msgdata)
            .then( (boardmessage)=> {
                console.log('boardmessage saved');
            })
            .catch( (err)=> {
                console.log('boardmessage error',err);
            });
        break;

        case "tnUpdateSchedule":
            // STUDENT_AVAILABILITY_UPDATED / System
            // <Member First Name, Last Initial.> has updated availabilty.

            // If student edited his/her own schedule.
            msg = req.__('{{USERNAME}} has updated availabilty.', { USERNAME: CommonModel.name(req.user.fname,req.user.lname) });
            // msg = "One student updated his/her requested schedule time.";
            
            User.findOne(sysUserQuery,function(err,objectData){
                if(!err){
                    msgdata = {sender: objectData._id, reciever: null, tnId: lesson._id, message: msg, isAutomessage: true, type: "PUBLIC", triggerEvent: true};
                    BoardMessage.saveMessageInDatabase(msgdata)
                    .then( (boardmessage)=> {
                        console.log('tnUpdateSchedule boardmessage saved');
                    })
                    .catch( (err)=> {
                        console.log('tnUpdateSchedule boardmessage error',err);
                    });
                }
            });
        break;

        case "tnOperationActionForm":
            // If tm taken any top level action.
            if(req.body.action=='mark_complete'){
                // TALENTNOOK_COMPLETED / TM
                // All the sessions have been completed. This Lesson is now closed. 
                msg = req.__('All the sessions have been completed. This Lesson is now closed.');
                // msg = "Lesson has been completed.";
            }else if(req.body.action=='suspend'){
                // TALENTOOK_SUSPENDED / TM
                // This Talntnook has been put on hold.
                msg = req.__('This Talntnook has been put on hold.');
                // msg = "Lesson has been suspended.";
            }else if(req.body.action=='activate'){
                // TALENTNOOK_RESUMED / TM
                // Hi all! We are resuming this Lesson. 
                msg = req.__('Hi all! We are resuming this Lesson.');
                // msg = "Lesson has been activated or resumed.";
            }            

            msgdata = {sender: lesson.tmId._id, reciever: null, tnId: lesson._id, message: msg, isAutomessage: true, type: "PUBLIC", triggerEvent: true};
            BoardMessage.saveMessageInDatabase(msgdata)
            .then( (boardmessage)=> {
                console.log('boardmessage saved');
            })
            .catch( (err)=> {
                console.log('boardmessage error',err);
            });
        break;
        
        case "tmFormSessionDetail":
        case "tnFormSessionDetail":
            // TALENTNOOK_UPDATED / TM
            // Hi Parents! I have updated the session details. Please let me know if you have any questions.

            // UPDATE STUDENTS COUNT IF ACCEPT DECLINED ON REQUESTES.
            Lesson.updateStudentCounts(lesson._id)
            .then((result)=>{
                console.log('success updateStudentCounts', result);
            }).catch((err)=>{
                console.log('err in updateStudentCounts',err);
            });
            
            // If tm change session detail related information.
            msg = req.__('Hi Parents! I have updated the session details. Please let me know if you have any questions.');
            // msg = "Few modification made by Talentmaster in session section please check.";

            msgdata = {sender: lesson.tmId._id, reciever: null, tnId: lesson._id, message: msg, isAutomessage: true, type: "PUBLIC", triggerEvent: true};
            BoardMessage.saveMessageInDatabase(msgdata)
            .then( (boardmessage)=> {
                console.log('boardmessage saved');
            })
            .catch( (err)=> {
                console.log('boardmessage error',err);
            });
        break;

        case "tmFormSessionOutline":
            // TALENTNOOK_UPDATED / TM
            // Hi Parents! I have updated the session outline. Please let me know if you have any questions.

            // If tm change session detail related information.
            msg = req.__('Hi Parents! I have updated the session outline. Please let me know if you have any questions.');
            // msg = "Session outline updated, please check session outline section.";
            
            msgdata = {sender: lesson.tmId._id, reciever: null, tnId: lesson._id, message: msg, isAutomessage: true, type: "PUBLIC", triggerEvent: true};
            BoardMessage.saveMessageInDatabase(msgdata)
            .then( (boardmessage)=> {
                console.log('boardmessage saved');
            })
            .catch( (err)=> {
                console.log('boardmessage error',err);
            });
        break;

        case "tmFormFees":
        case "tnFormFees":
            // TALENTNOOK_FEE_UPDATED / TM
            // Hi Parents! I have updated the fees. Please let me know if you have any questions.

            // If tm change session detail related information.
            msg = req.__('Hi Parents! I have updated the fees. Please let me know if you have any questions.');
            // msg = "Fees detail has been updated, please check fees section.";
            
            msgdata = {sender: lesson.tmId._id, reciever: null, tnId: lesson._id, message: msg, isAutomessage: true, type: "PUBLIC", triggerEvent: true};
            BoardMessage.saveMessageInDatabase(msgdata)
            .then( (boardmessage)=> {
                console.log('boardmessage saved');
            })
            .catch( (err)=> {
                console.log('boardmessage error',err);
            });
        break;

        case "tmFormPolicy":
        case "tnFormPolicy":
            // TALENTNOOK_UPDATED / TM
            // Hi Parents! I have updated my policies. Please let me know if you have any questions.

            // If tm change session detail related information.
            msg = req.__('Hi Parents! I have updated my policies. Please let me know if you have any questions.');
            // msg = "Policies have been udpated, please check policy section.";
            
            msgdata = {sender: lesson.tmId._id, reciever: null, tnId: lesson._id, message: msg, isAutomessage: true, type: "PUBLIC", triggerEvent: true};
            BoardMessage.saveMessageInDatabase(msgdata)
            .then( (boardmessage)=> {
                console.log('boardmessage saved');
            })
            .catch( (err)=> {
                console.log('boardmessage error',err);
            });
        break;

        case "sendInvitation":
            // STUDENT_INVITED / Sender => System
            // <Member First Name, Last Initial.> has invited a new student to join.

            msg = req.__('{{USERNAME}} has invited a new student to join.', { USERNAME: CommonModel.name(req.user.fname,req.user.lname) });
            
            User.findOne(sysUserQuery,function(err,objectData){
                if(!err){
                    msgdata = {sender: objectData._id, reciever: null, tnId: lesson._id, message: msg, isAutomessage: true, type: "PUBLIC", triggerEvent: true};            
                    BoardMessage.saveMessageInDatabase(msgdata)
                    .then( (boardmessage)=> {
                        console.log('boardmessage saved');
                    })
                    .catch( (err)=> {
                        console.log('boardmessage error',err);
                    });
                }else{
                   console.log('boardmessage error 2 ',err); 
                }
            });
        break;

        case "joinWaitListed":
            // STUDENT_WAITLISTED / Sender => system
            // <Student First Name, Last Initial> has requested to be waitlisted.
            // If join request then
            // <Student First Name, Last Initial> has requested to join.

            // console.log('lesson.tmId._id',lesson.tmId);
            if(dataobj && dataobj.length>0){
                User.findOne(sysUserQuery,function(err,objectData){
                    if(!err){
                        var senderId = objectData._id;
                        console.log('joinWaitListed additionalParams.isNewRecord', additionalParams.isNewRecord, additionalParams.parentData);
                        if(additionalParams.isNewRecord && additionalParams.parentData){
                            msg = req.__('{{USERNAME}} has requested a new Lesson.', { USERNAME: CommonModel.name(additionalParams.parentData.fname, additionalParams.parentData.lname) });

                            msgdata = {sender: senderId, reciever: null, tnId: lesson._id, message: msg, isAutomessage: true, type: "PUBLIC", triggerEvent: true};            
                            BoardMessage.saveMessageInDatabase(msgdata)
                            .then( (boardmessage)=> {
                                console.log('boardmessage saved');
                            })
                            .catch( (err)=> {
                                console.log('boardmessage error',err);
                            });
                        }else{
                            for (var i = dataobj.length - 1; i >= 0; i--) {
                                if(additionalParams.isWaitlist){
                                    // STUDENT_WAITLISTED / Sender => system
                                    // <Student First Name, Last Initial> has requested to be waitlisted.
                                    msg = req.__('{{USERNAME}} has requested to be waitlisted.', { USERNAME: CommonModel.name(dataobj[i].student.fname,dataobj[i].student.lname) });
                                }else{
                                    // STUDENT_WAITLISTED / Sender => system
                                    // <Student First Name, Last Initial> has requested to join.
                                    if(additionalParams.isNewRecord){
                                        msg = req.__('{{USERNAME}} has requested to join.', { USERNAME: CommonModel.name(dataobj[i].student.fname,dataobj[i].student.lname) });
                                    }else{
                                        msg = req.__('{{USERNAME}} has requested to join.', { USERNAME: CommonModel.name(dataobj[i].student.fname,dataobj[i].student.lname) });
                                    }
                                }

                                msgdata = {sender: senderId, reciever: null, tnId: lesson._id, message: msg, isAutomessage: true, type: "PUBLIC", triggerEvent: true};            
                                BoardMessage.saveMessageInDatabase(msgdata)
                                .then( (boardmessage)=> {
                                    console.log('boardmessage saved');
                                })
                                .catch( (err)=> {
                                    console.log('boardmessage error',err);
                                });
                            }
                        }
                    }else{
                        console.log('joinWaitListed additionalParams.isNewRecord error',err);
                    }
                });
            }
        break;
    }
}

module.exports.updateStudentHost = (resetParentHostId, tnObject) => {
    console.log('updateStudentHost',resetParentHostId, tnObject);
    if(resetParentHostId && tnObject && tnObject.students){
        let newStudentHostId = null;
        for (var i = tnObject.students.length - 1; i >= 0; i--) {
            if(tnObject.students[i].parent._id.toString() == resetParentHostId.toString() && tnObject.students[i].currentStatus=='ACCEPTED'){
                newStudentHostId = tnObject.students[i].student._id;
                break;
            }
        }
        if(newStudentHostId){
            // Update the new student host id
            Lesson.findOneAndUpdate({_id: tnObject._id}, {studentHostId: new MyObjectId(newStudentHostId)}, function(err, data){
                if (err) {
                    console.log('Error in update studentHostId');
                }else{
                    console.log('studentHostId updated successfully',newStudentHostId);
                }
            }); 
        }
    }
}

// push new reqeust
module.exports.pushReqeustData = (query, pushdata) => {
    let deferred = Q.defer();
    var self = Lesson;

    self.findOneAndUpdate(query,pushdata,{new: true},function(err,objectData){
        if(!err){
            deferred.resolve(objectData);
        }else{
            console.log("Unable to push new non existingreuqest.", err);
            deferred.reject("Unable to push new reuqest.");
        }
    });

    return deferred.promise;
}

/* handleRequest new request or join request. */
module.exports.handleRequest = (req, callback) => {
    console.log('handleRequest',req.body);
    var self = Lesson;
    var isNewRecord = true;
    var parentData, teacherData, requestData, userComment, basicRequestData;
    var dataobj = [];

    if(! (req.body.parent && req.body.teacher && req.body.students && req.body.requestedSchedule)){
        callback("Please provide proper data.", null);
        return false;
    }

    Q.fcall(() => {
        return User.findById(req.body.teacher);
    }).then( (teacherData) => {
        return [ User.findById(req.body.parent), teacherData ];
    }).spread( (parentObject, teacherObject) => {
        parentData = parentObject;
        teacherData = teacherObject;
        
        requestData = [];
        basicRequestData = {
                parent: req.body.parent,
                comment: req.body.comment,
                isFlexible: (req.body.isFlexible)? req.body.isFlexible : false,
                isWaitlist: req.body.isWaitlist,
                isGrandfathering: req.body.isGrandfathering,
                parentWillingToHost: req.body.parentWillingToHost,
                requestedSchedule: (req.body.requestedSchedule && req.body.requestedSchedule.schedule)? req.body.requestedSchedule.schedule : {schedule: {}},// If Schedule posted then save it else save blank schedule.
                currentStatus: (req.body.isWaitlist)? 'WAITLISTED' : 'REQUESTED',
            };

        userComment = req.body.comment;
        
        if(req.body._id && !_.isEmpty(req.body._id) && (req.body.isJoinRequest || req.body.isWaitlist)){
            isNewRecord = false;
            // Tn already exists and this is join request

            let promiseArray = [];
            if(req.body.students && req.body.students.length>0){
                for (var i = 0, reqCount = 0; i < req.body.students.length ; i++) {
                    if(req.body.students[i].isJoined && !req.body.students[i].isAlreadyJoined){
                        let reqId = (new Date()).getTime()+''+Math.floor(Math.random() * 101);
                        let reqdata = _.clone(basicRequestData);
                        // console.log('reqdata', reqdata);

                        // For automessage
                        dataobj.push({student: req.body.students[i]});

                        reqdata.student = req.body.students[i]._id;
                        reqdata.requestId = reqId;
                        requestData.push(reqdata);

                        let qry = {};
                        let updatedata = {};
                        if(reqCount==0 && req.body.requestId && !_.isEmpty(req.body.requestId)){
                            qry = {_id: req.body._id, students: { $elemMatch: { requestId: req.body.requestId}} };
                            delete reqdata.requestId;

                            let studentreq = {
                                "students.$.parent": basicRequestData.parent,
                                "students.$.comment": basicRequestData.comment,
                                "students.$.isFlexible": basicRequestData.isFlexible,
                                "students.$.isWaitlist": basicRequestData.isWaitlist,
                                "students.$.isGrandfathering": basicRequestData.isGrandfathering,
                                "students.$.parentWillingToHost": basicRequestData.parentWillingToHost,
                                "students.$.requestedSchedule": basicRequestData.requestedSchedule,// If Schedule posted then save it else save blank schedule.
                                "students.$.currentStatus": basicRequestData.currentStatus,
                                "students.$.student": reqdata.student,
                            };
                            updatedata = { $set: studentreq };
                        }else{
                            qry = {_id: req.body._id};
                            updatedata = { $push: { students: reqdata } };
                        }

                        promiseArray.push(
                            Lesson.pushReqeustData(qry,updatedata)
                            .then(function(result) {
                                // log success
                                return result;

                            }, function(error) {
                                // log failure
                                console.log('error promiseArray.push',error);
                                return error;

                            }).catch(function(error) {
                                // catch and ignore any error thrown in either logToMongoFunction above
                                console.log('error promiseArray.push catch',error);
                                return;
                            })
                        );
                        reqCount++;
                    }
                }
            }
            return Q.all(promiseArray);
        }else{
            if(req.body.students && req.body.students.length>0){
                for (var i = 0; i < req.body.students.length ; i++) {
                    if(req.body.students[i].isJoined && !req.body.students[i].isAlreadyJoined){
                        let reqId = (new Date()).getTime()+''+Math.floor(Math.random() * 101);
                        let reqdata = _.clone(basicRequestData);
                        // console.log('reqdata', reqdata);

                        // For automessage
                        dataobj.push({student: req.body.students[i]});

                        reqdata.student = req.body.students[i]._id;
                        reqdata.requestId = reqId;
                        reqdata.isGrandfathering = basicRequestData.isGrandfathering;
                        requestData.push(reqdata);
                    }
                }
            }
            isNewRecord = true;
            // Now default name will with Talent what was selected and post fix for TN name
            // var tms = (new Date()).getTime();
            // let tnName = 'Lesson-'+tms;
            
            let tnName = req.body.talent+' '+config.TN_NAME_POSTFIX;

            let tnData = {
                name : tnName,
                tmId: req.body.teacher,
                talent: req.body.talent, // Initially assign the talent for which it was requetsed, because we have restriction for parent, he can only put or select tm existing options.
                status: "REQUESTED", // New request from parent will be always 'REQUESTED'                     
                students: requestData,
                rate: 0
            };

            // INITIALLY COPY DATA FROM TALENTMASTER
            tnData.fees = teacherData.tm.fees;
            tnData.sessionDuration = teacherData.tm.sessionDuration;
            tnData.minStudentPerSession = teacherData.tm.minStudentPerSession;
            tnData.studentPerSession = teacherData.tm.studentPerSession;
            tnData.availableSlot = teacherData.tm.studentPerSession;

            tnData.isFreeTrial = teacherData.tm.isFreeTrial;
            // tnData.travelradius = teacherData.tm.travelradius;
            tnData.taughtLevel = teacherData.tm.taughtLevel;
            tnData.policy = teacherData.tm.policy;
            tnData.languages = teacherData.tm.languages;
            
            /*tnData.fullAddress = teacherData.fullAddress;
            tnData.address = teacherData.address;
            tnData.location = teacherData.location;*/

            // Initially we are going to put address of the requested parent. But no host will be there initially. It will decided later.
            tnData.fullAddress = parentData.fullAddress;
            tnData.address = parentData.address;
            tnData.location = parentData.location;

            // console.log('tnData,req.body', tnData,req.body);

            // Initially we are going to put address of the requested parent. But no host will be there initially. It will decided later.
            // Initially talentmaster is the default host for requested lesson later on he can modify this.
            // tnData.hostId = teacherData._id;

            return Lesson.create(tnData);
        }
        // return next(null, objectData);
    }).then( (objectData) => {
        if(isNewRecord){
            // UPDATE USER COUNTS IF ANY ONE CREATE ANY NEW TALENTNOOK
            Lesson.updateCountsForUsers(req.body.teacher);
            Lesson.updateCountsForUsers(req.body.parent);
            // console.log("created objectData",objectData);
            // return objectData; // self.findOne(query).populate('tmId hostId studentHostId students.parent students.student', {password:0});
            let query = {_id: objectData._id};
            return self.findOne(query).populate('tmId hostId studentHostId students.parent students.student', {password:0});
        }else{
            // console.log('updateExistingRequest objectData',objectData._id);
            let query = {_id: req.body._id};
            Lesson.updateCountsForUsers(req.body.teacher);
            Lesson.updateCountsForUsers(req.body.parent);
            return self.findOne(query).populate('tmId hostId studentHostId students.parent students.student', {password:0});
        }
    }).then( (objectData) => {
        // Param data and linkKeyword that will be replaced dynamically in private messages.
        // Saperation can be done by using "~"
        let paramData = "/lesson/launch/"+objectData._id;
        let linkKeyword = "request";
        // let msg = "You have a new {{LINK0}}.";
        let msg = req.__('You have a new {{LINK0}}.',{ LINK0: "{{LINK0}}"});
        CommonModel.sendPrivateMessage(msg, 'SYSTEM_USER', teacherData, paramData, linkKeyword, function(){
            console.log('New request email sending process complete.');
        });
        // let msg2 = "Your new request submitted {{LINK0}}.";
        // Your request (hyperlink) for <talent> has been submitted to <Tm first name> (Hyperlink).
        
        paramData = "/lesson/launch/"+objectData._id+"~"+"/talentmaster/"+objectData.tmId.username;
        linkKeyword = "request~"+objectData.tmId.fname;
        let msg2 = req.__('Your {{LINK0}} for {{TALENT}} has been submitted to {{LINK1}}.', { LINK0: "{{LINK0}}", LINK1: "{{LINK1}}", TALENT: objectData.talent });
        CommonModel.sendPrivateMessage(msg2, 'SYSTEM_USER', parentData, paramData, linkKeyword, function(){
            console.log('New request email sending process complete.');
        });
        // Send mail in background.
        CommonModel.sendMailForNewRequest(objectData._id, parentData, teacherData, {userComment: userComment}, function(){
            console.log('Join request email sending process complete.');
        });
        // Update common schedule as well
        updateCommonSchedule(self,objectData);

        // To send auto message
        req.body.formName = 'joinWaitListed';
        // console.log("before triggerBackendProcess", isNewRecord, req.body.isWaitlist);
        self.triggerBackendProcess(req, objectData, dataobj, {isWaitlist: req.body.isWaitlist, isNewRecord: isNewRecord, parentData: parentData});

        // return next(null,objectData);
        callback(null, objectData);
    }).catch(err => {
        // return next(err, null);
        console.log('Encounterd Error', err);
        callback(err, null);
    });
}

// acknowledgeRequest new request or join request acknowledge.
module.exports.acknowledgeRequest = (req, callback) => {
    let tnId = req.params.tnId;
    let requestId = req.params.requestId;

    if(_.isEmpty(tnId) || _.isEmpty(requestId)){
        callback(true, 'ERROR', null);
        return;
    }
    let query = { _id: tnId, requests : {$elemMatch: { "requestId": requestId }} };

    Lesson.findOne(query, (err, tnData) => {
        if(err){
            callback(err, 'ERROR', null);
        }else{
            if(tnData && tnData.requests){
                let request = null;
                for (var i = 0; i < tnData.requests.length; i++) {
                    if(tnData.requests[i].requestId==requestId){
                        request = tnData.requests[i];
                        break;
                    }
                }

                if(request){
                    if(tnData.status == "ACKNOWLEDGED"){
                        // Already joind and acknowledgeed
                        // console.log('already joind or acknowledgeed');
                        callback(null, 'ALREADY_DONE', tnData);
                    }else{
                        let findQuery = query; // { _id: tnData._id, "requests.requestId": requestId };
                        let studentList = CommonModel.filterNonexistsStudent(tnData,request.students);
                        let updateData = { $set: { "status": "ACKNOWLEDGED" }, $push: { "students": { $each: studentList } } };
                        Lesson.findOneAndUpdate(findQuery, updateData, { upsert: false, new: true}, function(err, objectData){
                            if(err){
                                console.log('ERROR : IN UPDATE ACKNOWLEDGE REQUEST ', err);
                                callback(err, 'ERROR', null);
                            }else{
                                callback(null, 'ACKNOWLEDGED', objectData);
                            }
                        });
                    }
                }else{
                    callback(true, 'ERROR', null);
                }
            }else{
                callback(true, 'ERROR', null);
            }
        }
    });
}

module.exports.saveNote = (req, callback) => {
    let tnId = req.body.tnId;
    let note = req.body.note;
    const query = {_id: tnId};
    Lesson.findOne(query, function(err, data){
        if (err) {
           callback({err:err, data: {}});
        } else {
            Lesson.update({_id: tnId}, { note: note }, {multi: false}, (err) => {
                if(err){
                    callback({err:err, data: {}});
                }else{
                    data.note = note;
                    callback({err:0, data:data});  
                }
            });           
        }
    });
}

// To update that how many student available and allowed in lesson.
module.exports.updateStudentCounts = (lessonId) => {
    var deferred = Q.defer();

    if(lessonId && !_.isEmpty(lessonId)){
        Lesson.findOne({_id: lessonId}, function(err, objectData){
            if (err) {
                // console.log('err', err.toString());
                deferred.reject({err: "Couldn't calculate student counts", data: null});
            } else {
                let acceptedCount = 0;
                for (var i = objectData.students.length - 1; i >= 0; i--) {
                    if(objectData.students[i].currentStatus == 'ACCEPTED'){
                        acceptedCount++;
                    }
                }
                let available = objectData.studentPerSession - acceptedCount;

                Lesson.findOneAndUpdate({_id: lessonId}, { availableSlot: available, totalSlot: objectData.studentPerSession }, {multi: false, new: true}, (err, updatedObject) => {
                    if(err){
                        // console.log('Error in count update totalSession ', count, lessonId);
                        deferred.reject({err: err.toString(), data: null});
                    }else{
                        deferred.resolve({err: null, data: updatedObject, count: available});
                    }
                });
                // deferred.resolve({err: null, data: objectData, count: 0});
            }
        });
    }
    return deferred.promise;
}

// To update that how many session created and last one held on.
module.exports.updateSessionCounts = (lessonId, isFreeTrial) => {
    var deferred = Q.defer();

    if(lessonId && !_.isEmpty(lessonId)){
        let aggregate_geo_object = [];
        // aggregate_geo_object.push({ $match: {tnId: lessonId} });
        // aggregate_geo_object.push({ $sort: {"schedule.start": 1 }});
        // aggregate_geo_object.push({ $group: { _id: null, count: { $sum: 1 }} });
        // aggregate_geo_object.push({ $limit: 1 });
        // Session.aggregate(aggregate_geo_object, (err, results) => {

        Session.count({tnId: new MyObjectId(lessonId)}, function(err, totalCount) {
           console.log('Count is ' + totalCount);
            if (err) {
                console.log("Couldn't calculate session count");
                deferred.reject({err: "Couldn't calculate session count", data: null});
            } else {
                console.log('results for total sessions: ',totalCount);
                let updatedval = 1;
                if(totalCount){
                    updatedval = (totalCount>0) ? totalCount : 1;
                }

                if(updatedval){
                    Lesson.findOneAndUpdate({_id: lessonId}, { totalSession: updatedval }, {multi: false, new: true}, (err, updatedObject) => {
                        if(err){
                            console.log('Error in count update totalSession ', lessonId);
                            // console.log('err', err.toString());
                            deferred.reject({err: err.toString(), data: null});
                        }else{
                            deferred.resolve({err: null, data: updatedObject, count: totalCount});
                        }
                    });

                    if(isFreeTrial=='Yes'){
                        Lesson.findOne({_id: lessonId}, (err, tn) => {
                            if(!err){
                                let students = tn.students;
                                for(var i=0; i<students.length; i++){
                                    let student = students[i];
                                    if(student.currentStatus=='ACCEPTED' && (!student.freeTrailApplied)){
                                        let updateStudent = {};
                                        let query = {_id: lessonId, "students.student": student.student};
                                        updateStudent["students."+i+".freeTrailApplied"] = true;
                                        console.log("query: ", query, "updateStudent: ",updateStudent);
                                        Lesson.update(query, { $set: updateStudent }, {upsert:false},(err, updatedTn) => {
                                            if(!err){
                                                console.log('Updated successfully.');
                                            }
                                        });
                                    }
                                }
                            }
                        });
                    }
                }else{
                    console.log("Couldn't update session count");
                    deferred.reject({err: "Couldn't update session count", data: totalCount});
                }
            }
        });
    }else{
        deferred.reject({err: "Lesson id not provided", data: null});
    }
    return deferred.promise;
}

// To udpate the total talent nook hosted and managed as tm 
module.exports.updateCountsForUsers = (userId) => {
    var deferred = Q.defer();
    if(userId && !_.isEmpty(userId)){        
        // To update total registered/enrolled as tm
        // Lesson.where({tmId: userId, status: {$ne: "CANCLED"}, status: {$ne: "DRAFT"} })

        // Total lessons EnrolledTnAsTm as TM
        Lesson.where({tmId: userId}).count(function (err, count) {
            if (err) {
                console.log("err",err.toString());
                deferred.reject({err: "Couldn't calculate EnrolledTnAsTm count", data: null});
            }            
            // TODO: whether we need to consider canceled and draft or not.
            console.log('updateCountsForUsers ',userId, count);
            User.findOneAndUpdate({_id: userId}, { totalEnrolledTnAsTm: count }, {multi: false, new: true}, (err, updatedObject) => {
                if(err){
                    console.log('Error in count update totalEnrolledTnAsTm ', count, userId);
                    deferred.reject({err: "Couldn't calculate count for totalEnrolledTnAsTm", data: null});
                }else{
                    deferred.resolve({err: null, data: updatedObject});
                }
            });
        });

        // To update total hosted
        Lesson.where({hostId: userId}).count(function (err, count) {
            if (err) {
                console.log("err",err.toString());
            }
            // TODO: whether we need to consider canceled and draft or not.
            User.findOneAndUpdate({_id: userId}, { totalHostedTn: count }, {multi: false, new: true}, (err, updatedObject) => {
                if(err){
                    console.log('Error in count total hosted ', count, userId);
                    deferred.reject({err: "Couldn't calculate total hosted count", data: null});
                }else{
                    deferred.resolve({err: null, data: updatedObject});
                }
            });
        });

        // To update total joined as parent.
        let condition = {"students": { "$elemMatch": { "parent" : new MyObjectId(userId) } } };
        Lesson.where(condition).count(function (err, count) {
            if (err) {
                console.log("err",err.toString());
            }
            // TODO: whether we need to consider canceled and draft or not.
            User.findOneAndUpdate({_id: userId}, { totalEnrolledTn: count }, {multi: false, new: true}, (err, updatedObject) => {
                if(err){
                    console.log('Error in count total totalEnrolledTn ', count, userId);
                    deferred.reject({err: "Couldn't calculate total totalEnrolledTn count", data: null});
                }else{
                    deferred.resolve({err: null, data: updatedObject});
                }
            });
        });
    }
    return deferred.promise;
}

// type => existing user or new
module.exports.addNewRequestAndNotify = (type, fnData) => {
    var deferred = Q.defer();
    let self = Lesson;
    if(type){
        // Existing member
        // User.find({parent: new MyObjectId(fnData.reciever._id)},function(err,students){
        User.find({parent: fnData.reciever._id},function(err,students){
            if(!err){
                // console.log(students.length);
                /*let studentlist = [];
                for (var i = 0; i <= students.length; i++) {
                    if(students[i] && students[i]._id){
                        // console.log('student loop ',students[i]._id);
                        studentlist.push({
                            "leftOn" : null,
                            "isLeft" : null,
                            "joindOn" : null,
                            "isJoined" : true,
                            "parentId" : fnData.sender._id,
                            "_id" : students[i]._id
                        });
                    }
                }
                fnData.requestData.students = studentlist;

                let qry_condition = { _id: fnData.lesson._id, requests: { "$not": {"$elemMatch" : { parent: fnData.reciever._id}}} };
                let pushdata = { "$push": { "students": fnData.requestData } };
                */

                // Now we will not include any student only thing is that we will just send the invitation and user will come and will select student hisself.
                let qry_condition = { _id: fnData.lesson._id };
                let pushdata = { "$push": { "students": fnData.requestData } };

                self.findOneAndUpdate(qry_condition,pushdata,{new: true},function(err,objectData){
                    if(!err){
                        // for existing member
                        CommonModel.newInviteRequest(type, fnData, function(returendData){
                            console.log('newInviteRequest existing returendData',returendData);
                        });
                        deferred.resolve(objectData);
                    }else{
                        console.log("Unable to push new existing reuqest.", err);
                        deferred.reject("Unable to push new reuqest.");
                    }
                });
            }else{
                deferred.reject("Unable to find any students.");
            }
        });
    }else{
        // Non existing member
        let qry_condition = { _id: fnData.lesson._id };
        let pushdata = { "$push": { "students": fnData.requestData } };
        self.findOneAndUpdate(qry_condition,pushdata,{new: true},function(err,objectData){
            if(!err){
                // For non existing member                
                CommonModel.newInviteRequest(type, fnData, function(returendData){
                    console.log('newInviteRequest non existing returendData',returendData);
                });
                deferred.resolve(objectData);
            }else{
                console.log("Unable to push new non existingreuqest.", err);
                deferred.reject("Unable to push new reuqest.");
            }
        });
    }

    return deferred.promise;
}

module.exports.sendInvitation = (req, res, callback) => {
    console.log('sendInvitation req.body', req.body);
    let userId = req.body.fromUser;
    let tnId = req.body.lessonId;
    let toEmail = req.body.toEmail;
    let description = req.body.description;
    let isGrandfatheringInvite = req.body.isGrandfathering;

    let senderUser, recieverUser, lesson;
    let dataobj = {};
    let existingMembers = [];
    let nonExistingMembers = _.clone(toEmail);

    if(!_.isEmpty(userId) && (!_.isEmpty(tnId))){
        let query = {_id: tnId};
        let self = Lesson;

        return Q.fcall(() => {
            return [self.findOne(query).populate('tmId hostId studentHostId students.parent students.student', {password:0}), User.findOne({_id: userId})];
        }).spread( (currentLesson, sender) => {
            senderUser = sender;
            lesson = currentLesson;

            return User.find({email: {$in: toEmail }});
        }).then(recievers => {
            recieverUser = recievers;
            // console.log('recievers', recievers.length);
            
            var promiseArray = [];
            // Push new request and clean nonexisting member array and make existing member array.
            for (var i = 0; i < recievers.length; i++) {
                if(_.indexOf(toEmail, recievers[i].email) !=-1){
                    _.pull(nonExistingMembers,recievers[i].email);
                    // console.log('recievers id ', recievers[i]._id, recievers[i].email);

                    let reqId = (new Date()).getTime()+''+Math.floor(Math.random() * 101);
                    let requestData = {
                            requestId: reqId,
                            parent: recievers[i]._id,
                            comment: '',
                            student: null, // There is no student initially.
                            isFlexible: false,
                            isWaitlist: false,
                            parentWillingToHost: false,
                            requestedSchedule: {schedule: {}},
                            currentStatus: 'INVITED',
                            isGrandfatheringInvite: isGrandfatheringInvite,
                        };
                    let fnData = {lesson: lesson, sender: senderUser, reciever: recievers[i], requestData: requestData, description: description};

                    promiseArray.push(self.addNewRequestAndNotify(true, fnData).then(function(result) {
                        // log success
                        return result;

                    }, function(error) {
                        // log failure
                        console.log('error ExistingMembers',error);
                        return error;

                    }).catch(function(error) {
                        // catch and ignore any error thrown in either logToMongoFunction above
                        console.log('error ExistingMembers',error);
                        return;
                    }));

                    existingMembers.push(recievers[i]);                    
                }
            }

            // console.log('nonExistingMembers',nonExistingMembers);
            // Push new request for non existing members.
            for (var i = 0; i < nonExistingMembers.length ; i++) {
                // for non existing member
                let reqId = (new Date()).getTime()+''+Math.floor(Math.random() * 101);
                let requestData = {
                        requestId: reqId,
                        parent: null, // There is no student initially.
                        comment: '',
                        parentemail: nonExistingMembers[i],
                        student: null, // There is no student initially.
                        isFlexible: false,
                        isWaitlist: false,
                        parentWillingToHost: false,
                        requestedSchedule: {schedule: {}},
                        currentStatus: 'INVITED',
                        isGrandfatheringInvite: isGrandfatheringInvite,
                    };
                let fnData = {lesson: lesson, sender: senderUser, reciever: nonExistingMembers[i], requestData: requestData, description: description};

                promiseArray.push(self.addNewRequestAndNotify(false, fnData).then(function(result) {
                    // log success
                    return result;
                }, function(error) {
                    // log failure
                    console.log('error nonExistingMembers',error);
                    return error;
                }).catch(function(error) {
                    // catch and ignore any error thrown in either logToMongoFunction above
                    console.log('catch error nonExistingMembers',error);
                    return;
                }));
            }
            // Send email finally to 
            if(recievers && toEmail.length > 0){
                let addtionalData = {isGrandfatheringInvite: isGrandfatheringInvite};
                InviteFriend.addStudentsInvitation(senderUser, toEmail, description, addtionalData, function(err,invitedData){
                    if(err){
                        console.log(' Error in invite: ',err);
                    }else{
                        // triggerBackendProcess = (req,lesson,dataobj,additionalParams={})
                        let dataobj = {sender: senderUser};
                        req.body.formName = 'sendInvitation';
                        self.triggerBackendProcess(req,lesson,dataobj);
                    } 
                });
            }

            return Q.all(promiseArray);        
        }).then((objectData) => {
            return self.findOne(query).populate('tmId hostId studentHostId students.parent students.student', {password:0});
        }).then((objectData) => {
            return callback(null, objectData);
        }).catch(err => {
            // console.log('final data to update error ',err.toString());
            return callback({err: 2, msg: err.toString(), data: {}});
        });
    }else{
        return callback({err: 1, msg: "Invalid data sent", data: {}});
    }
}

// Get all board messages counts user specific
module.exports.getUnseenCountOfUserMessages = (queryParam) => {
    console.log('getUnseenCountOfUserMessages',queryParam);
    // CONVERTED INTO PROMISS
    var deferred = Q.defer();

    if(!_.isEmpty(queryParam.userId)){
        let pagesize = (queryParam.pagesize)? queryParam.pagesize : 10;
        let userId = queryParam.userId;
        let userObjectId = new MyObjectId(queryParam.userId);        
        let totalpages = (queryParam.totalpages>0)? queryParam.totalpages : 0;
        let aggregate_object = [];

        aggregate_object.push({ '$match': { $or: [{tmId: userObjectId}, {students: { $elemMatch: { parent: userObjectId }}}] } });
        aggregate_object.push({ "$lookup": 
                            { 
                                "from": "boardmessages",
                                "localField": "_id",
                                "foreignField": "tnId",
                                "as": "boardMessage"
                            }
                        });
        aggregate_object.push({ "$unwind": "$boardMessage" });
        aggregate_object.push({ "$addFields": { 
                            "unseen": { "$cond": { if: { $gt: [ {$indexOfArray: [ "$boardMessage.seenBy", userId ] }, -1] }, then: 0, else: 1 } },
                        }
                    });
        aggregate_object.push({ "$group": 
                    {
                        "_id": "$_id",
                        "unseenMsg": { "$sum": "$unseen" },
                        "talentmasterId": { "$first": "$tmId"},
                    }
                });

        // console.log('aggregate_object', aggregate_object);
        console.log('aggregate_object', JSON.stringify(aggregate_object));
        Lesson.aggregate(aggregate_object, (err, results, stats) => {
            if (err) {
                console.log('Lesson', err);
                deferred.reject(err);
            } else {
                deferred.resolve(results);
            }
        });
    }else{
        deferred.reject('Please provide proper data');
    }
    return deferred.promise;
}

// To create all initial draft lessons according to talents and experience level.
module.exports.createInitialDraftLesson = (req, params) => {
    // console.log('createInitialDraftLessons', req.body, userData);
    console.log('createInitialDraftLessons', req.body, params);
    // CONVERTED INTO PROMISS
    var deferred = Q.defer();
    let promiseArray = [];

    if(params.onlyForOneTalent && params.talentDdata){
        let dataobj = JSON.parse(JSON.stringify(params.talentDdata));
        let originalTalentData = _.clone(dataobj);
        delete dataobj._id;
        // console.log("dataobj before save", dataobj);

        if(originalTalentData.taughtLevel){
            dataobj.tmId = new MyObjectId(params.userData._id); // Because that is object for relation
            
            dataobj.lessonType = (params.lessonType && params.lessonType!="" && params.lessonType!="0" && params.lessonType!=0)? params.lessonType : 'AVAILABLE';

            dataobj.fullAddress = params.userData.fullAddress;
            dataobj.address = params.userData.address;
            dataobj.location = params.userData.location;
            dataobj.policy = (params.userData.tm.policy)? params.userData.tm.policy : '';
            
            let defaultSchedule = {"sunday" : [], "monday" : [], "tuesday" : [ ], "wednesday" : [ ], "thursday" : [ ], "friday" : [ ], "saturday" : []};
            dataobj.schedule = (params.userData.tm.schedule)? params.userData.tm.schedule : defaultSchedule;

            // If Grandfathering
            dataobj.isGrandfathering = (req.body.isGrandfathering)? req.body.isGrandfathering : false;
            // dataobj.status = 'DRAFT';
            dataobj.status = (params.lessonStatus && params.lessonStatus!="")? params.lessonStatus : 'DRAFT';
            dataobj.availableSlot = dataobj.studentPerSession; 
            dataobj.totalSlot = dataobj.studentPerSession;

            if(originalTalentData.taughtLevel.length==0){
                let lessonName = CommonModel.getLessonAutoName(originalTalentData.talent, '');
                dataobj.name = lessonName;
                console.log("Lesson dataobj", dataobj, originalTalentData.talent, originalTalentData.taughtLevel);
                promiseArray.push( Lesson.create(dataobj) );
            }else if(originalTalentData.taughtLevel.length==1){
                if(!_.isEmpty(originalTalentData.taughtLevel[0])){
                    let lessonName = CommonModel.getLessonAutoName(originalTalentData.talent, originalTalentData.taughtLevel[0]);
                    dataobj.name = lessonName;
                    console.log("Lesson dataobj", dataobj, originalTalentData.talent, originalTalentData.taughtLevel[0]);
                    promiseArray.push( Lesson.create(dataobj) );
                }
            }else{
                for (var j = originalTalentData.taughtLevel.length - 1; j >= 0; j--) {
                    if(!_.isEmpty(originalTalentData.taughtLevel[j])){
                        let lessonName = CommonModel.getLessonAutoName(originalTalentData.talent, originalTalentData.taughtLevel[j]);
                        dataobj.name = lessonName;
                        dataobj.taughtLevel = [originalTalentData.taughtLevel[j]];
                        console.log("Lesson dataobj", dataobj, originalTalentData.talent, originalTalentData.taughtLevel[j]);
                        promiseArray.push( Lesson.create(dataobj) );
                    }
                }
            }
        }

        Q.all(promiseArray)
        .then((result)=>{
            deferred.resolve(true);
        })
        .catch((err)=>{
            console.log('err 1', err);
            deferred.resolve(false);
        });
    }else if(!params.onlyForOneTalent){
        if(!_.isEmpty(params.userData._id) && params.userData.tm && params.userData.tm.talents && params.userData.tm.talents.length>0){
            let talents = params.userData.tm.talents;
            
            for (var i = talents.length - 1; i >= 0; i--) {
                let dataobj = talents[i].toJSON();
                delete dataobj._id;

                if(talents[i].taughtLevel){
                    dataobj.tmId = new MyObjectId(params.userData._id); // Because that is object for relation
                    dataobj.lessonType = (params.lessonType && params.lessonType!="" && params.lessonType!="0" && params.lessonType!=0)? params.lessonType : 'AVAILABLE';

                    dataobj.fullAddress = params.userData.fullAddress;
                    dataobj.address = params.userData.address;
                    dataobj.location = params.userData.location;
                    dataobj.policy = (params.userData.tm.policy)? params.userData.tm.policy : '';
                    
                    let defaultSchedule = {"sunday" : [], "monday" : [], "tuesday" : [ ], "wednesday" : [ ], "thursday" : [ ], "friday" : [ ], "saturday" : []};
                    dataobj.schedule = (params.userData.tm.schedule)? params.userData.tm.schedule : defaultSchedule;

                    // If Grandfathering
                    dataobj.isGrandfathering = (req.body.isGrandfathering)? req.body.isGrandfathering : false;
                    // dataobj.status = 'DRAFT';
                    dataobj.status = (params.lessonStatus && params.lessonStatus!="")? params.lessonStatus : 'DRAFT';
                    dataobj.availableSlot = dataobj.studentPerSession; 
                    dataobj.totalSlot = dataobj.studentPerSession;

                    if(talents[i].taughtLevel.length==0){
                        let lessonName = CommonModel.getLessonAutoName(talents[i].talent, '');
                        dataobj.name = lessonName;
                        console.log("Lesson dataobj", dataobj, talents[i].talent, talents[i].taughtLevel);
                        promiseArray.push( Lesson.create(dataobj) );
                    }else if(talents[i].taughtLevel.length==1){
                        if(!_.isEmpty(talents[i].taughtLevel[0])){
                            let lessonName = CommonModel.getLessonAutoName(talents[i].talent, talents[i].taughtLevel[0]);
                            dataobj.name = lessonName;
                            // console.log("Lesson dataobj", dataobj, talents[i].talent, talents[i].taughtLevel[0]);
                            promiseArray.push( Lesson.create(dataobj) );
                        }
                    }else{
                        for (var j = talents[i].taughtLevel.length - 1; j >= 0; j--) {
                            if(!_.isEmpty(talents[i].taughtLevel[j])){
                                let lessonName = CommonModel.getLessonAutoName(talents[i].talent, talents[i].taughtLevel[j]);
                                dataobj.name = lessonName;
                                dataobj.taughtLevel = [talents[i].taughtLevel[j]];
                                // console.log("Lesson dataobj", dataobj, talents[i].talent, talents[i].taughtLevel[j]);
                                promiseArray.push( Lesson.create(dataobj) );
                            }
                        }
                    }
                }
            }

            Q.all(promiseArray)
            .then((result)=>{
                deferred.resolve(true);
            })
            .catch((err)=>{
                console.log('err 1', err);
                deferred.resolve(false);
            });
        }else{
            deferred.resolve(false);
        }
    }
    return deferred.promise;
}

// To update talent and categores for all matching users when updated in admin (any talent or category)
module.exports.updateTalentCategories = (updatedData, isCategory) => {
    var deferred = Q.defer();

    if(isCategory){
        // Need to update only the category data.
        if(updatedData._id && updatedData.name && updatedData.name!=""){
            let search_val = new RegExp("^"+updatedData.name+"$","i");
            let query = { "category": search_val };

            Q.fcall(() => {
                return Lesson.find(query);
            }).then((results) => {
                // console.log('updateTalentCategories found users ', users.length, query);
                if(results.length >0){
                    results.forEach(function(elem){
                        let recordFound = false;
                        if(updatedData.name.toLowerCase()==elem.category.toLowerCase()){
                            elem.categoryImage = updatedData.image;
                            recordFound = true;
                        }
                        if(recordFound){
                            let userquery = {_id: new MyObjectId(elem._id)};
                            Lesson.findOneAndUpdate(userquery, elem, function(err, updatedObj){
                                // console.log("err, updatedObj", err, updatedObj);
                            });
                        }
                    });
                }

                deferred.resolve("All lessons updated successfully.");
            }).catch(err => {
                console.log("Error in update category: ",err.toString());
                deferred.reject("Please provide proper data.");
            }); 
        }else{
            console.log("updateTalentCategories invalid data");
            deferred.reject("Please provide proper data.");
        }
    }else{
        // Need to update talent and category data.
        let search_val = new RegExp("^"+updatedData.talent+"$","i");
        let query = { "talent": search_val };

        Q.fcall(() => {
            return Lesson.find(query);
        }).then((results) => {
            // console.log('updateTalentCategories found lessons ', results.length, query);
            if(results.length >0){
                results.forEach(function(elem){
                    if(updatedData.categoryId && updatedData.categoryId.name && updatedData.categoryId.name!=""  && updatedData.talent && updatedData.talent!=""){
                        elem.category = updatedData.categoryId.name;
                        elem.categoryImage = updatedData.categoryId.image;
                    }
                    elem.talentImage = updatedData.image;

                    let userquery = {_id: new MyObjectId(elem._id)};
                    // let updateUserData = {"tm.talents": elem.tm.talents};
                    Lesson.findOneAndUpdate(userquery, elem, function(err, updatedObj){
                        // console.log("err, updatedObj", err, updatedObj);
                    });
                });
            }

            deferred.resolve("All lessons updated successfully.");
        }).catch(err => {
            console.log("Error in update category: ",err.toString());
            deferred.reject("Please provide proper data.");
        });
    }    
    return deferred.promise;        
}



// TALENTNOOK COMMON SCHEDULE LIST RELATED FUNCTIONS START
function updateCommonSchedule(model,lesson){
    // console.log('updateCommonSchedule Initiated', lesson.students);
    if(lesson.students && lesson.students.length > 0){
        let commonData = initScheduleListCreation(lesson.students);
        if(commonData[0] && commonData[1]){
            model.findOneAndUpdate({_id: lesson._id}, {commonSchedule: commonData[1]}, {new:true}, function(err, objectData){
                if(err){
                    console.log('Error on common schedule update');
                }else{
                    console.log('Common Schedule:', objectData.commonSchedule);
                }
            });
        }
    }
}
function initScheduleListCreation(parentRequests){
    pickScheduleList = {"sunday": [], "monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [], "saturday": []};
    filteredPickScheduleList = {"sunday": [], "monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [], "saturday": []};
    commonList = {"sunday": [], "monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [], "saturday": []};

    for (var i = 0; i < parentRequests.length; i++) {
        pickScheduleList = addScheduleList(parentRequests[i],pickScheduleList);
    }    
    let bothList = filterScheduleList(pickScheduleList,filteredPickScheduleList);
    let hasCommonSchedule = false;
    _.each(bothList.filteredPickScheduleList, function(value, daykey){
        for (var i = value.length - 1; i >= 0; i--) {
            let repeat = getRepeatCount(bothList.pickScheduleList, daykey, value[i]);
            // console.log('value, daykey',value[i], daykey, repeat);
            if(repeat > 1){
                hasCommonSchedule = true;
                commonList[daykey].push(value[i]);
            }
        }
    });
    // console.log('bothList', bothList, 'commonList' , commonList);
    // console.log('commonList' , commonList);
    return [hasCommonSchedule, commonList];
}
function addScheduleList(request, pickScheduleList){
    if(request.requestedSchedule){
        let self = this;
        _.forEach(pickScheduleList, function(value, key) {
            if(request.requestedSchedule[key]){
                _.forEach(request.requestedSchedule[key], function(value2, key2) {
                    // console.log('pickScheduleList',value2,key2,key);
                    pickScheduleList[key].push(value2);
                });
            }
        });      
    }
    return pickScheduleList;
}  
function filterScheduleList(pickScheduleList, filteredPickScheduleList){
    if(pickScheduleList){
        filteredPickScheduleList = _.cloneDeep(pickScheduleList);
        filteredPickScheduleList = getUniqueValues(filteredPickScheduleList);
    }
    return {pickScheduleList: pickScheduleList, filteredPickScheduleList: filteredPickScheduleList};
}
function getUniqueValues(schedule){
    _.forEach(schedule, function(value,key) {
      schedule[key] = _.uniqWith(value, _.isEqual);
    });
    return schedule;
}
function getRepeatCount(pickScheduleList, searchKey, timeSlot){
    let count = 0;
    _.forEach(pickScheduleList[searchKey], function(value, key) {
        if(timeSlot.min==value.min && timeSlot.max==value.max){
            count++;
        } 
    });
    return count;
}
// TALENTNOOK COMMON SCHEDULE LIST RELATED FUNCTIONS FINISH

/* Formatting search data */
function formatSearchData(resultData, callback){
    let data = [];
    for (let i = resultData.length - 1; i >= 0; i--) {
        dbobject = JSON.parse(JSON.stringify(resultData[i]));
        // console.log(dbobject);
        // var dataobj = dbobject.obj;
        let dataobj = dbobject;
        //delete dataobj._id;
        delete dataobj.__v;
        dataobj.dis = resultData[i].dis;

        data.push(dataobj);
    }
    callback(data);
}
/* Formatting time query */
function getTimeQuery(timedata,selectedDay){
    let query = {};
    if(timedata.includes("&")){
        // 11&13
        let minmax = timedata.split("&");
        minmax[0] = parseInt(minmax[0]);
        minmax[1] = parseInt(minmax[1]);
        // query = { $elemMatch: {min: {"$gte": minmax[0]}, max: {"$lte": minmax[1]}} };
        if(selectedDay==1){
            // For all days
            // query = {min: {"$gte": minmax[0]}, max: {"$lte": minmax[1]}};
            query = [];
            query.push({"schedule.sunday.min": {"$gte": minmax[0]}, "schedule.sunday.max": {"$lte": minmax[1]}});
            query.push({"schedule.monday.min": {"$gte": minmax[0]}, "schedule.monday.max": {"$lte": minmax[1]}});
            query.push({"schedule.tuesday.min": {"$gte": minmax[0]}, "schedule.tuesday.max": {"$lte": minmax[1]}});
            query.push({"schedule.wednesday.min": {"$gte": minmax[0]}, "schedule.wednesday.max": {"$lte": minmax[1]}});
            query.push({"schedule.thursday.min": {"$gte": minmax[0]}, "schedule.thursday.max": {"$lte": minmax[1]}});
            query.push({"schedule.friday.min": {"$gte": minmax[0]}, "schedule.friday.max": {"$lte": minmax[1]}});
            query.push({"schedule.saturday.min": {"$gte": minmax[0]}, "schedule.saturday.max": {"$lte": minmax[1]}});

        }else{
            // For particular day
            let keyMin = "schedule."+selectedDay+".min";
            let keyMax = "schedule."+selectedDay+".max";
            // query[keyMin] = {"$gte": minmax[0]};
            // query[keyMax] = {"$lte": minmax[1]};
            // query = [];
            // query = {[keyMin]: {"$gte": minmax[0]}, [keyMax]: {"$lte": minmax[1]}};
            query = {[keyMin]: {"$gte": minmax[0]}, [keyMax]: {"$lte": minmax[1]}};
            // query.push({[keyMin]: {"$gte": minmax[0]}});
            // query.push({[keyMax]: {"$lte": minmax[1]}});
        }
        console.log("getTimeQuery",query);
    }else if(timedata.includes(">")){
        let minmax = timedata.split(">");
        minmax[1] = parseInt(minmax[1]);
        // query = {min: {"$gte": minmax[1]}};
        if(selectedDay==1){
            // For all days
            query = [];
            query.push({"schedule.sunday.min": {"$gte": minmax[1]}});
            query.push({"schedule.monday.min": {"$gte": minmax[1]}});
            query.push({"schedule.tuesday.min": {"$gte": minmax[1]}});
            query.push({"schedule.wednesday.min": {"$gte": minmax[1]}});
            query.push({"schedule.thursday.min": {"$gte": minmax[1]}});
            query.push({"schedule.friday.min": {"$gte": minmax[1]}});
            query.push({"schedule.saturday.min": {"$gte": minmax[1]}});

        }else{
            // For particular day
            let keyMin = "schedule."+selectedDay+".min";
            // query[keyMin] = {"$gte": minmax[1]};
            query = {[keyMin]: {"$gte": minmax[1]}};
        }
    }else if(timedata.includes("<")){
        let minmax = timedata.split("<");
        minmax[1] = parseInt(minmax[1]);
        // query = {max: {"$lte": minmax[1]}};
        if(selectedDay==1){
            // For all days
            query = [];
            query.push({"schedule.sunday.max": {"$lt": minmax[1]}});
            query.push({"schedule.monday.max": {"$lt": minmax[1]}});
            query.push({"schedule.tuesday.max": {"$lt": minmax[1]}});
            query.push({"schedule.wednesday.max": {"$lt": minmax[1]}});
            query.push({"schedule.thursday.max": {"$lt": minmax[1]}});
            query.push({"schedule.friday.max": {"$lt": minmax[1]}});
            query.push({"schedule.saturday.max": {"$lt": minmax[1]}});

        }else{
            // For particular day
            let keyMax = "schedule."+selectedDay+".min";
            // query[keyMax] = {"$lt": minmax[1]};
            query = {[keyMax]: {"$lt": minmax[1]}};
        }
    }    
    return query;
}