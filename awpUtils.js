window.AWP = window.AWP || {};

window.AWP.CreateMeetingSites = function () {
    var context,
    	//onFail = AWP.JsomUtils.logErrorToUser,
    	meetingSites,
	    webUrl, 
		newWeb,
	    newGroup,
        dialog,
        dialogTitle = "Please wait",
        dialogMessage = "We are creating your new meeting site: ",
        dialogHeight = 500,
        dialogWidth = 500;
        
        
	var createDefaultGroups = function () {
		    createVisitors();
		    // all other group creations will occur as callbacks;
		},
		
		createVisitors = function () {
		    createGroup(
		        "Visitors", "Visitors Group",
		        SP.RoleType.reader, "set_associatedVisitorGroup",
		        createMembers, oncreateGroupFailed
		    );
		},
		
		createMembers = function () {
			//Note: Members group has permission changed from usual contributor to reader
		    createGroup(
		        "Members", "Members Group",
		        SP.RoleType.reader, "set_associatedMemberGroup",
		        createOwners, oncreateGroupFailed
		    );
		},
		
		createOwners = function () {
		    createGroup(
		        "Owners", "Owners Group",
		        SP.RoleType.administrator, "set_associatedOwnerGroup",
		        oncreateWebsiteSucceeded, oncreateGroupFailed
		    );
		},
		
		createGroup = function (title, description, SPRoleType, assocFn, callbackOk, callbackFail) {
		
			console.log("in createGroup : title= " + webUrl + " " + title);

		    var groupCreationInfo = new SP.GroupCreationInformation(),
		        collRoleDefinitionBinding,
		        oRoleDefinition,collRollAssignment;

		    groupCreationInfo.set_title(webUrl + " " + title);
		    groupCreationInfo.set_description(description);
		    newGroup = newWeb.get_siteGroups().add(groupCreationInfo);
		    collRoleDefinitionBinding = SP.RoleDefinitionBindingCollection.newObject(context);
		    oRoleDefinition = newWeb.get_roleDefinitions().getByType(SPRoleType);
		    collRoleDefinitionBinding.add(oRoleDefinition);
		    collRollAssignment = newWeb.get_roleAssignments();
		    collRollAssignment.add(newGroup, collRoleDefinitionBinding);
		    context.load(newGroup);
		    context.load(oRoleDefinition, 'Name');
		
		    context.executeQueryAsync(
		        function () {
		            assocGroup(assocFn, callbackOk, callbackFail)
		        },
		        callbackFail
		    );
		},
		
		assocGroup = function (assocFn, callbackOk, callbackFail) {
		    newWeb[assocFn](newGroup);
		    newWeb.update();
		    context.executeQueryAsync(callbackOk, callbackFail);
		},
		
		oncreateWebsiteSucceeded = function (waitModal, displayAlert) {
            if (waitModal) {
                waitModal.close();
            }

			if (displayAlert){
			    alert("Created Web site: " + webUrl);
			}
		},
		
		oncreateWebsiteFailed= function (waitModal, msg) {
            if (waitModal) {
                waitModal.close();
            }

			AWP.JsomUtils.logErrorToUser(msg);
		},

		
		oncreateGroupFailed = function (sender, args) {
		    alert('Fail. ' + webUrl + " --- " + args.get_message() + '\n' + args.get_stackTrace());
		},

		createSubSiteAsync = function(siteUrl, siteTitle, inheritParentPermissions, templateGuidName) {
			var onSuccess,
				onFail = oncreateWebsiteFailed;
				
	        if (inheritParentPermissions){
	        	onSuccess = oncreateWebsiteSucceeded;
	        }else{
	        	onSuccess = createDefaultGroups;
	        }

			var d = $.Deferred();
	        createSubSite(siteUrl, siteTitle, inheritParentPermissions, templateGuidName, 
	        					function(onSuccess){ d.resolve(onSuccess); }, function(sender, args){ d.reject(args.get_message()); });
		    return d.promise();
		},


    	createSubSite = function(siteUrl, siteTitle, inheritParentPermissions, templateGuidName, onSuccess, onFail) {
	    	console.log("in createSubSite: siteUrl = " + siteUrl);
	    	
	    	webUrl = siteUrl;
	    	
		    parentWeb = context.get_web(),
		    webCreationInfo = new SP.WebCreationInformation();
	
	        webCreationInfo = new SP.WebCreationInformation();
	        webCreationInfo.set_url(webUrl);
	        webCreationInfo.set_title(siteTitle);
	        webCreationInfo.set_description("my description");
	        webCreationInfo.set_language(1033);            
	        webCreationInfo.set_useSamePermissionsAsParentSite(inheritParentPermissions);
	        webCreationInfo.set_webTemplate(templateGuidName);
	
	        newWeb = parentWeb.get_webs().add(webCreationInfo);
			parentWeb.update();
	              
	        context.executeQueryAsync(onSuccess, onFail);
				
		},
		
		WORKS_createSubSite = function(siteUrl, siteTitle, inheritParentPermissions, templateGuidName) {
	    	console.log("in createSubSite: siteUrl = " + siteUrl);
	    	
		    var onSuccess;
		    var dfd = $.Deferred();;
		    
	    	webUrl = siteUrl;
	    	
		    parentWeb = context.get_web(),
		    webCreationInfo = new SP.WebCreationInformation();
	
	        webCreationInfo = new SP.WebCreationInformation();
	        webCreationInfo.set_url(webUrl);
	        webCreationInfo.set_title(siteTitle);
	        webCreationInfo.set_description("my description");
	        webCreationInfo.set_language(1033);            
	        webCreationInfo.set_useSamePermissionsAsParentSite(inheritParentPermissions);
	        webCreationInfo.set_webTemplate(templateGuidName);
	
	        newWeb = parentWeb.get_webs().add(webCreationInfo);
			parentWeb.update();
	       
	        dialog = SP.UI.ModalDialog.showWaitScreenWithNoClose(dialogTitle, dialogMessage, dialogHeight, dialogWidth);
	        
	        if (inheritParentPermissions){
	        	onSuccess = oncreateWebsiteSucceeded;
	        }else{
	        	onSuccess = createDefaultGroups;
	        }
	        
	        context.executeQueryAsync(onSuccess, oncreateWebsiteFailed);
	        
		    context.executeQueryAsync(function () {
		        dfd.resolve();
		    },
		    function (sender, args) {
		        dfd.reject(args.get_message());
		    });

			return dfd.promise();
		},
    	
		getNewMeetingSites = function(onSuccess, onFail) {
	    	console.log("Finding all Meeting Sites with status New");
	    	meetingSites = [];
	    	
	        context = new SP.ClientContext.get_current();
	        
			var camlQuery = new SP.CamlQuery();
		    camlQuery.set_viewXml("<View><Query><Where><Eq><FieldRef Name='Status' /><Value Type='Choice'>New</Value></Eq></Where></Query></View>");
		    var fieldProperties = {};
		    var usefulData = {};
			//Note: Title is CommitteeName
		    var includeFields = "Include(Title,SiteTitle,Admin,User)";    
			includeFields = null;    
		    
			return AWP.JsomUtils.getListItemsByListTitleCamlQueryInclude("MeetingSites", camlQuery, fieldProperties, includeFields, usefulData)
				.then(getNewMeetingSitesOnSuccess, AWP.JsomUtils.logErrorToUser);
	    }, 
	
		getNewMeetingSitesOnSuccess = function(items) {
			var itemCount = 0;
		    	
		    items.get_data().forEach(function (item) {
		    	var meetingSite = {};
	
		    	meetingSite.admins = [];
		    	meetingSite.users = [];
		    	meetingSite.committeeName = item.get_item('Title');
		    	meetingSite.siteTitle = item.get_item('SiteTitle');
		    	
		    	item.get_item('Admin').forEach(function (admin) {
		    		meetingSite.admins.push(admin.get_lookupValue());
		    	});
		    	
		    	item.get_item('User').forEach(function (user) {
		    		meetingSite.users.push(user.get_lookupValue());
		    	});
	
				meetingSites.push(meetingSite);
		    	
		        itemCount++;
		    });
		
			console.log("in getNewMeetingSitesOnSuccess: itemCount = " + itemCount);
	    },
    
	    doCreateAllSites = function(inheritParentPermissions, templateGuidName) {
	
			meetingSites.forEach(function (site){
				//console.log(JSON.stringify(site));
			});
			
	
			//TODO: get unique users from admins and users and ensure they exist.
			//		see: https://stackoverflow.com/questions/1960473/get-all-unique-values-in-a-javascript-array-remove-duplicates
	
		    //Need async 'waterfall loop' to submit print requests for all forms for each patient, one patient at a time.
		    //See: http://stackoverflow.com/questions/15504921/asynchronous-loop-of-jquery-deferreds-promises
		
			
			var waitModal = null;						
			
		    //begin the chain by resolving a new $.Deferred
		    var dfd = $.Deferred().resolve();
			
		   // use a forEach to create a closure freezing each site
		    meetingSites.forEach(function (site) {
	
		        // add to the $.Deferred chain with $.then() and re-assign
		        dfd = dfd.then(function () {
				    waitModal = SP.UI.ModalDialog.showWaitScreenWithNoClose(dialogTitle, 
									    dialogMessage + "'" + site.siteTitle + "'", dialogHeight, dialogWidth);

			    	console.log(JSON.stringify(site));
	
		            return createSubSiteAsync(site.committeeName, site.siteTitle, inheritParentPermissions, templateGuidName)
		            		//.then(function () { waitModal.close(); }, function (msg) { waitModal.close(); AWP.JsomUtils.logErrorToUser(msg); });
		            		.then(function () { 
		                			oncreateWebsiteSucceeded(waitModal, false)
		                		}, 
		                		function (msg) {
		                			oncreateWebsiteFailed(waitModal, msg)
		                		}
		                	);

			        }); 
		        	        
				});
			
			return dfd.promise();
		};

	/****************************************************************/
	/* Exported functions											*/
	/****************************************************************/

    return {
    	   
        createAllSites : function(inheritParentPermissions, templateName) {
	        context = new SP.ClientContext.get_current();

			getNewMeetingSites().then(function() {
				return AWP.JsomUtils.getTemplateName(templateName);
			}).then(function (templateGuidName) {
				return doCreateAllSites(inheritParentPermissions, templateGuidName);
			});

/*
			).catch(function () {	
				AWP.JsomUtils.handleErrorToUser(sender, args);
			})
*/

    	},

	    
        OLD_createSite : function(siteName, siteTitle, inheritParentPermissions, templateName) {
        	console.log("in createSite: " + siteName + ", site title: " + siteTitle);
	        context = new SP.ClientContext.get_current();

        	AWP.JsomUtils.getTemplateName(templateName)
        	.then(
        		function(templateGuidName) {
				    var waitModal = SP.UI.ModalDialog.showWaitScreenWithNoClose(dialogTitle, 
									    dialogMessage + "'" + siteTitle + "'", dialogHeight, dialogWidth);
                	return createSubSiteAsync(siteName, siteTitle, inheritParentPermissions, templateGuidName)
	                	.then(function () { 
	                			oncreateWebsiteSucceeded(waitModal, true)
	                		}, 
	                		function (msg) {
	                			oncreateWebsiteFailed(waitModal, msg)
	                		}
	                	);
                	}
                ); 
    		},
    		
    	createSite : function(siteName, siteTitle, inheritParentPermissions, templateName) {
        	console.log("in createSite: " + siteName + ", site title: " + siteTitle);
	        context = new SP.ClientContext.get_current();

        	AWP.JsomUtils.getTemplateName(templateName)
        	.then(
        		function(templateGuidName) {
				    var waitModal = SP.UI.ModalDialog.showWaitScreenWithNoClose(dialogTitle, 
									    dialogMessage + "'" + siteTitle + "'", dialogHeight, dialogWidth);
                	return WORKS_createSubSite(siteName, siteTitle, inheritParentPermissions, templateGuidName)
                		.then(function() {
                			return createDefaultGroups();
                		});
                		/*** THIS needs re-adding once createDefaultGroups has been promisified
	                	.then(function () { 
	                			oncreateWebsiteSucceeded(waitModal, true)
	                		}, 
	                		function (msg) {
	                			oncreateWebsiteFailed(waitModal, msg)
	                		}
	                	);
	                	**/
                	}
                ); 
    		},
	
    	
		/****************************************************************/
		/* END of Exported functions									*/
		/****************************************************************/
	
    		
    	}
    	
}();


