window.AWP = window.AWP || {};

window.AWP.CreateMeetingSites = function () {
    var context,
    	waitModal,
    	//onFail = AWP.JsomUtils.logErrorToUser,
    	meetingSites,
	    webUrl, 
	    webName,
		newWeb,
	    newGroup,
        dialog,
        dialogTitle = "Please wait",
        dialogMessage = "We are creating your new meeting site: ",
        dialogHeight = 500,
        dialogWidth = 500;
        
        
    var createWeb = function (webName, webTitle, webdesc, template, inheritPermissions) {

        console.log("in createWeb");

        var parentWeb = context.get_web(),
            collWeb = parentWeb.get_webs(),
            webCreationInfo = new SP.WebCreationInformation();

        var deferred = $.Deferred();

        webCreationInfo.set_title(webTitle);
        webCreationInfo.set_url(webName);
        webCreationInfo.set_description(webdesc);
        webCreationInfo.set_webTemplate(template);
        webCreationInfo.set_useSamePermissionsAsParentSite(inheritPermissions);

        web = collWeb.add(webCreationInfo);

        parentWeb.update();

        context.executeQueryAsync(
            function () {
                deferred.resolve();
            },
            function (sender, args) {
                deferred.reject(args.get_message());
            }
        );

        return deferred.promise();
    },

    assocGroup = function (group, assocFn) {
        console.log("in assocGroup: assocFn = " + assocFn);

        var deferred = $.Deferred();

        web[assocFn](group);
        web.update();
        context.executeQueryAsync(
            function () {
                deferred.resolve();
            },
            function (sender, args) {
                deferred.reject(args.get_message());
            }
        );

        return deferred.promise();
    },

    createGroup = function (webName, groupTitle, groupDescription, SPRoleType) {

        console.log("in createGroup: webName = " + webName + ", groupTitle = " + groupTitle);

        var groupCreationInfo = new SP.GroupCreationInformation(),
            collRoleDefinitionBinding,
            oRoleDefinition,collRollAssignment;

        var deferred = $.Deferred();

        groupCreationInfo.set_title(webName + " " + groupTitle);
        groupCreationInfo.set_description(groupDescription);
        newGroup = web.get_siteGroups().add(groupCreationInfo);

        collRoleDefinitionBinding = SP.RoleDefinitionBindingCollection.newObject(context);
        oRoleDefinition = web.get_roleDefinitions().getByType(SPRoleType);
        collRoleDefinitionBinding.add(oRoleDefinition);
        collRollAssignment = web.get_roleAssignments();
        collRollAssignment.add(newGroup, collRoleDefinitionBinding);

        //Add users. TODO: Users will be passedin as an array.
        /*
        user = web.ensureUser('rvn39417');
		
        var userCollection = newGroup.get_users();
        userCollection.addUser(user);
        context.load(user);
        */

        context.load(newGroup);
        context.load(oRoleDefinition, 'Name'); // TODO - CHECK THIS OUT!!

        context.executeQueryAsync(
            function () {
                deferred.resolve(newGroup);
            },
            function (sender, args) {
                deferred.reject(args.get_message());
            }
        );

        return deferred.promise();
    },


    oncreateWebsiteSucceeded = function (webName, displayAlert) {
    	console.log("in oncreateWebsiteSucceeded: " + webName + ", displayAlert: " + displayAlert);
    	
        if (waitModal) {
            waitModal.close();
        }

		if (displayAlert){
		    alert("Created Web site: " + webName);
		}
    },

    oncreateWebsiteFailed = function (webName, msg) {
        if (waitModal) {
            waitModal.close();
        }

        AWP.JsomUtils.logErrorToUser(msg);
    },

    logError = function(error) {
        console.log('An error occured: ' + error);
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

    doCreateAllSites = function(inheritPermissions, templateGuidName) {

		meetingSites.forEach(function (site){
			//console.log(JSON.stringify(site));
		});
		

		//TODO: get unique users from admins and users and ensure they exist.
		//		see: https://stackoverflow.com/questions/1960473/get-all-unique-values-in-a-javascript-array-remove-duplicates

	    //Need async 'waterfall loop' to submit print requests for all forms for each patient, one patient at a time.
	    //See: http://stackoverflow.com/questions/15504921/asynchronous-loop-of-jquery-deferreds-promises
	
		
		waitModal = null;						
		
	    //begin the chain by resolving a new $.Deferred
	    var dfd = $.Deferred().resolve();
		
	   // use a forEach to create a closure freezing each site
	    meetingSites.forEach(function (site) {

	        // add to the $.Deferred chain with $.then() and re-assign
	        dfd = dfd.then(function () {
	        	var webName = site.committeeName;
	        	var webDesc = "my desc";
	        	
			    waitModal = SP.UI.ModalDialog.showWaitScreenWithNoClose(dialogTitle, 
								    dialogMessage + "'" + site.siteTitle + "'", dialogHeight, dialogWidth);

		    	console.log(JSON.stringify(site));
		    	
		    	return createWebAndDefaultGroups(webName, site.siteTitle, webDesc, templateGuidName, inheritPermissions);
		    }); 
	        	        
		});
		
		return dfd.promise();
	},
	
	createWebAndDefaultGroups = function(webName, siteTitle, webDesc, templateGuidName, inheritPermissions){
			    	
	            return createWeb(webName, siteTitle, webDesc, templateGuidName, inheritPermissions)
	            .then(function(){
	                return createGroup(webName, "Visitors", "Visitors Group", SP.RoleType.reader)
	                    .then(function (group) {
	                            return assocGroup(group, "set_associatedVisitorGroup");
	                        }
	                    );
	            	}
	            )
	            .then(function(){
	                return createGroup(webName, "Members", "Members Group", SP.RoleType.editor)
	                    .then(function (group) {
	                            return assocGroup(group, "set_associatedMemberGroup");
	                        }
	                    );
	            	}
	            )
	            .then(function(){
	                return createGroup(webName, "Owners", "Owners Group", SP.RoleType.administrator)
	                    .then(function (group) {
	                            return assocGroup(group, "set_associatedOwnerGroup");
	                        }
	                    );
	            	}
	            )
	            .then(function(msg){
	            		return oncreateWebsiteSucceeded(webName, false);
	            	}
	            ).catch(function(msg){
	            		return oncreateWebsiteFailed(webName, msg);
	            	}
	            );

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

    	},
 		
        createSingleSite : function(webName, webTitle, webdesc, templateName, inheritPermissions) {
        	console.log("in createSingleSite : " + webName+ ", site title: " + webTitle + ", templateName: " + templateName);
	        context = new SP.ClientContext.get_current();

			AWP.JsomUtils.getTemplateName(templateName)
			.then(function(templateGuidName){
			    waitModal = SP.UI.ModalDialog.showWaitScreenWithNoClose(dialogTitle, 
				    dialogMessage + "'" + webTitle + "'", dialogHeight, dialogWidth);

	            return createWebAndDefaultGroups(webName, webTitle, "my desc", templateGuidName, inheritPermissions);
	        });
        }

		/****************************************************************/
		/* END of Exported functions									*/
		/****************************************************************/
    	
	}
}();


