package com.lobox.feed.controller;

import java.io.IOException;
import java.security.Principal;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import javax.servlet.annotation.MultipartConfig;

import org.apache.commons.io.IOUtils;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.impl.client.DefaultHttpClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.PropertySource;
import org.springframework.core.env.Environment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import com.lobox.controller.BaseController;
import com.lobox.feed.client.NotificatiionClient;
import com.lobox.feed.client.UserClient;
import com.lobox.feed.domain.FeedComments;
import com.lobox.feed.domain.FeedLikes;
import com.lobox.feed.domain.FileType;
import com.lobox.feed.domain.HomeFeed;
import com.lobox.feed.services.HomeFeedService;
import com.lobox.model.UserProfileInfo;
import com.lobox.model.master.User;
import com.lobox.utils.JsonUtils;



@CrossOrigin
@RestController
@MultipartConfig(maxFileSize = 1024*1024*1024, maxRequestSize = 1024*1024*1024)
public class HomeFeedController extends BaseController{
	private static final Logger logger = LoggerFactory.getLogger(HomeFeedController.class);
	
	@Autowired
	HomeFeedService homeFeedService;
	
	@Autowired
	UserClient userClient;
	 
    @Autowired
	NotificatiionClient notificationClient;
	
	final private int PAGE_SIZE = 10;
	
	@RequestMapping("/")
	@PreAuthorize("#oauth2.hasScope('read')")
	public String securedCall() {
		return "success (id: " + UUID.randomUUID().toString().toUpperCase() + ")";
	}
	
	@RequestMapping("/callback")
	public Principal getUserDetail() {
		return  (Principal) SecurityContextHolder
				.getContext().getAuthentication().getPrincipal();

	}
	@GetMapping("/ping")
	public ResponseEntity<String>  ping() {
		return handleException("this is my test rest api", HttpStatus.OK);
		
	}
	
	@GetMapping("/check/{id}")
	@PreAuthorize("#oauth2.hasScope('read')")
	public ResponseEntity<String> findCustomer(@PathVariable("id") Integer id) {
		User s = userClient.userDetails("v.bohra@matellio.com");
		return handleException(JsonUtils.toJson(s),HttpStatus.OK);
	}
	
	/**
	 * @param pageNo
	 * @param currentUser
	 * @return feeds in JSON format otherwise throw invalid request exception. 
	 * @access: only for users
	 */
	@PreAuthorize("hasRole('ROLE_USER')")
	@GetMapping(path = "/feed/{pageNo}")
	public ResponseEntity<String> getFeed(@PathVariable int pageNo, @AuthenticationPrincipal String  currentUser) {
		User user = userClient.userDetails(currentUser);
    	if(user!=null) {
    		Pageable pageable = new PageRequest(pageNo, PAGE_SIZE);
    		return new ResponseEntity<>(JsonUtils.toJson(homeFeedService.getFeed(pageable, user.getId(), null)),HttpStatus.OK);
    	}else {
    		return handleException("Invalid request.",HttpStatus.PRECONDITION_FAILED);
    	}
	}
	
	/**
	 * @param companyId
	 * @param pageNo
	 * @param currentUser
	 * @access: only for users
	 * @return company feeds in JSON format otherwise throw invalid request exception.
	 */
	@PreAuthorize("hasRole('ROLE_USER')")
	@GetMapping(path = "/companyFeed/{companyId}/{pageNo}")
	public ResponseEntity<String> companyFeed(@PathVariable Long companyId, @PathVariable int pageNo, @AuthenticationPrincipal String  currentUser) {
		User user = userClient.userDetails(currentUser);
    	if(user!=null) {
    		Pageable pageable = new PageRequest(pageNo, PAGE_SIZE);
    		return new ResponseEntity<>(JsonUtils.toJson(homeFeedService.getFeed(pageable, user.getId(), companyId)),HttpStatus.OK);
    	}else {
    		return handleException("Invalid request.",HttpStatus.PRECONDITION_FAILED);
    	}
	}
	
	/**
	 * @param homeFeed
	 * @param currentUser
	 * @access: only for users
	 * @return added feed in JSON format otherwise throw invalid request exception.
	 */
	@PreAuthorize("hasRole('ROLE_USER')")
	@PostMapping(path = "addFeed")
	public ResponseEntity<String> addFeed( @RequestBody HomeFeed homeFeed, @AuthenticationPrincipal String  currentUser) {
		User user = userClient.userDetails(currentUser);
		if(homeFeed!=null) {
			return new ResponseEntity<>(JsonUtils.toJson(homeFeedService.addFeed(homeFeed,user.getId(),false)),HttpStatus.OK);
    	}else {
    		return handleException("Invalid request.",HttpStatus.PRECONDITION_FAILED);
    	}		
	}
	
	/**
	 * @param file
	 * @param type
	 * @param fileName
	 * @param currentUser
	 * @access: only for users
	 * @return uploaded file other wise return file related exceptions like no space left, invalid file type etc..
	 */
	@PreAuthorize("hasRole('ROLE_USER')")
	@RequestMapping(path = "/uploadImage/{type}")
	public ResponseEntity<String> uploadResume(
			@RequestParam("file") Optional<MultipartFile>  file, 
			@PathVariable Optional<String> type, 
			@RequestParam("fileName") Optional<String> fileName,
			@AuthenticationPrincipal String  currentUser){
		User user = userClient.userDetails(currentUser);
		FileType fileType = null;
		try {
			fileType = FileType.valueOf(type.get());
		} catch (IllegalArgumentException | NullPointerException e) {
			return handleException("Invalid file type : " + type,
					HttpStatus.PRECONDITION_FAILED, e);
		}
		
		try {
			//save in databasehomeFeedService
			String fileNames = UUID.randomUUID().toString().toUpperCase()+fileName.get();
			homeFeedService.createPhysicalFile(file.get(), fileNames);
			return new ResponseEntity<>(fileNames,HttpStatus.OK);
		} catch (IllegalAccessException e) {
			return handleException(e.getMessage(),
					HttpStatus.PRECONDITION_FAILED, e);
		} catch (IOException e) {
			String insufficientStorageExceptionCause = "No space left on device";
			if(e.getMessage().trim().equalsIgnoreCase(insufficientStorageExceptionCause)){
				return handleException(e.getMessage(),
						HttpStatus.INSUFFICIENT_STORAGE, e);
			}else{
				return handleException(e.getMessage(),
						HttpStatus.INTERNAL_SERVER_ERROR, e);
			}
		} catch (Exception e) {
			return handleException("Error uploading file " + file.get().getOriginalFilename(),
					HttpStatus.INTERNAL_SERVER_ERROR, e);
		}
	}
	
	/**
	 * @param homeFeed
	 * @param currentUser
	 * @access: only for users
	 * @return added comment by users otherwise invalid request exception.
	 */
	@PreAuthorize("hasRole('ROLE_USER')")
	@PostMapping(path = "postComment")
	public ResponseEntity<String> postComment( @RequestBody HomeFeed homeFeed, @AuthenticationPrincipal String  currentUser) {
		User user = userClient.userDetails(currentUser);
		if(homeFeed!=null) {
			return new ResponseEntity<>(JsonUtils.toJson(homeFeedService.postComment(homeFeed,user.getId())),HttpStatus.OK);
    	}else {
    		return handleException("Invalid request.",HttpStatus.PRECONDITION_FAILED);
    	}		
	}
	
	/**
	 * @param feedId
	 * @param pageNo
	 * @param currentUser
	 * @access: only for users
	 * @return comments by feed otherwise invalid request exception.
	 */
	@PreAuthorize("hasRole('ROLE_USER')")
	@GetMapping(path = "getComments/{feedId}/{pageNo}")
	public ResponseEntity<String> getComments( @PathVariable Long feedId, @PathVariable int pageNo, @AuthenticationPrincipal String  currentUser) {
		User user = userClient.userDetails(currentUser);
		if(user!=null) {
			Pageable pageable = new PageRequest(pageNo, PAGE_SIZE);
			return new ResponseEntity<>(JsonUtils.toJson(homeFeedService.getComments(user.getId(), feedId, pageable)),HttpStatus.OK);
    	}else {
    		return handleException("Invalid request.",HttpStatus.PRECONDITION_FAILED);
    	}		
	}
	
	/**
	 * @param homeFeed
	 * @param currentUser
	 * @access: only for users
	 * @return posted like by users otherwise invalid request exception.
	 */
	@PreAuthorize("hasRole('ROLE_USER')")
	@PostMapping(path = "postLike")
	public ResponseEntity<String> postLike( @RequestBody HomeFeed homeFeed, @AuthenticationPrincipal String  currentUser) {
		User user = userClient.userDetails(currentUser);
		if(homeFeed!=null) {
			return new ResponseEntity<>(JsonUtils.toJson(homeFeedService.postLike(homeFeed,user.getId())),HttpStatus.OK);
    	}else {
    		return handleException("Invalid request.",HttpStatus.PRECONDITION_FAILED);
    	}		
	}
	
	/**
	 * @param feedComment
	 * @param currentUser
	 * @access: only for users
	 * @return posted comment reply by users otherwise invalid request exception.
	 */
	@PreAuthorize("hasRole('ROLE_USER')")
	@PostMapping(path = "postCommentReply")
	public ResponseEntity<String> postCommentReply( @RequestBody FeedComments feedComment, @AuthenticationPrincipal String  currentUser) {
		User user = userClient.userDetails(currentUser);
		if(feedComment!=null) {
			return new ResponseEntity<>(JsonUtils.toJson(homeFeedService.postCommentReply(feedComment,user.getId())),HttpStatus.OK);
    	}else {
    		return handleException("Invalid request.",HttpStatus.PRECONDITION_FAILED);
    	}		
	}
	
	/**
	 * @param commentId
	 * @param currentUser
	 * @access: only for users
	 * @return comment replies by users otherwise invalid request exception.
	 */
	@PreAuthorize("hasRole('ROLE_USER')")
	@GetMapping(path = "getCommentReplies/{commentId}")
	public ResponseEntity<String> getCommentReplies( @PathVariable Long commentId, @AuthenticationPrincipal String  currentUser) {
		User user = userClient.userDetails(currentUser);
		if(user!=null) {
			return new ResponseEntity<>(JsonUtils.toJson(homeFeedService.getCommentReplies(user.getId(), commentId)),HttpStatus.OK);
    	}else {
    		return handleException("Invalid request.",HttpStatus.PRECONDITION_FAILED);
    	}		
	}
	
	/**
	 * @param feedComment
	 * @param currentUser
	 * @access: only for users
	 * @return posted comment like by users otherwise invalid request exception.
	 */
	@PreAuthorize("hasRole('ROLE_USER')")
	@PostMapping(path = "postCommentLike")
	public ResponseEntity<String> postCommentLike( @RequestBody FeedComments feedComment, @AuthenticationPrincipal String  currentUser) {
		User user = userClient.userDetails(currentUser);
		if(feedComment!=null) {
			return new ResponseEntity<>(JsonUtils.toJson(homeFeedService.postCommentLike(feedComment,user.getId())),HttpStatus.OK);
    	}else {
    		return handleException("Invalid request.",HttpStatus.PRECONDITION_FAILED);
    	}		
	}
	
	/**
	 * @param slugName
	 * @param currentUser
	 * @access: only for users
	 * @return feed by slugname otherwise invalid request exception.
	 */
	@PreAuthorize("hasRole('ROLE_USER')")
	@GetMapping(path = "getFeed/{slugName}")
	public ResponseEntity<String> getFeed( @PathVariable String slugName, @AuthenticationPrincipal String  currentUser) {
		User user = userClient.userDetails(currentUser);
		if(slugName!=null) {
			return new ResponseEntity<>(JsonUtils.toJson(homeFeedService.getFeed(slugName, user.getId())),HttpStatus.OK);
    	}else {
    		return handleException("Invalid request.",HttpStatus.PRECONDITION_FAILED);
    	}		
	}
}
