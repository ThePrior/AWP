window.AWP = window.AWP || {};

window.AWP.CreateMeetingSites = function () {
    var context,
    	web,
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

    createGroup = function (webName, groupTitle, groupDescription, SPRoleType, users) {

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

        users.forEach(function(userName) {
        	console.log("adding user: " + userName);
	        user = web.ensureUser(userName);
			
	        var userCollection = newGroup.get_users();
	        userCollection.addUser(user);
	        context.load(user);
        });

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
		    alert("Web site: " + "'" + webName + "'" + " successfully created");
		}
    },

    oncreateWebsiteFailed = function (msg) {
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
	    	meetingSite.members = [];
	    	meetingSite.visitors = [];
	    	meetingSite.siteName = item.get_item('Title');
	    	meetingSite.siteTitle = item.get_item('SiteTitle');
	    	
	    	item.get_item('Admin').forEach(function (admin) {
	    		meetingSite.admins.push(admin.get_lookupValue());
	    	});
	    	
	    	item.get_item('User').forEach(function (user) {
	    		meetingSite.members.push(user.get_lookupValue());
	    	});

			meetingSites.push(meetingSite);
	    	
	        itemCount++;
	    });
	
		console.log("in getNewMeetingSitesOnSuccess: itemCount = " + itemCount);
    },

    doCreateAllSites = function(inheritPermissions, templateGuidName) {	

		waitModal = null;						
		
	    //begin the chain by resolving a new $.Deferred
	    var dfd = $.Deferred().resolve();
	    
	    if (meetingSites.length === 0){
	    	dfd = dfd.then(function () {
				return AWP.JsomUtils.logMessageToUser("No sites found in 'MeetingSites' list with status 'New'");
			});					
		} else {	
		    //Need async 'waterfall loop' to create webs, one site at a time.
		    //See: http://stackoverflow.com/questions/15504921/asynchronous-loop-of-jquery-deferreds-promises
		
		   // use a forEach to create a closure freezing each site
		    meetingSites.forEach(function (site) {
	
		        // add to the $.Deferred chain with $.then() and re-assign
		        dfd = dfd.then(function () {
		        	
				    waitModal = SP.UI.ModalDialog.showWaitScreenWithNoClose(dialogTitle, 
									    dialogMessage + "'" + site.siteTitle + "'", dialogHeight, dialogWidth);
	
			    	console.log(JSON.stringify(site));    	
			    	
		    		return createWebFromMeetingSite (site, templateGuidName, inheritPermissions);
			    }); 
		        	        
			});
		}
		
		return dfd.promise();
	},
	
	createWebFromMeetingSite = function(site, templateGuidName, inheritPermissions){
    	var webDesc = "";

		return createWebAndDefaultGroups(site.siteName, site.siteTitle, webDesc, templateGuidName, inheritPermissions, 
												site.admins, site.members, site.visitors, false);
	},
	
	createSingleWeb = function(webName, webTitle, webDesc, templateGuidName, inheritPermissions){
		var admins = [],
			members = [],
			visitors = [];
		
		return createWebAndDefaultGroups(webName, webTitle, webDesc, templateGuidName, inheritPermissions, admins, members, visitors, true);
	},
	
	createWebAndDefaultGroups = function(webName, siteTitle, webDesc, templateGuidName, inheritPermissions, admins, members, visitors, displayAlert){
			    	
	            return createWeb(webName, siteTitle, webDesc, templateGuidName, inheritPermissions)
	            .then(function(){
	                return setMasterPages();
	            	}
	            )
	            .then(function(){
	                return createGroup(webName, "Visitors", "Visitors Group", SP.RoleType.reader, visitors)
	                    .then(function (group) {
	                            return assocGroup(group, "set_associatedVisitorGroup");
	                        }
	                    );
	            	}
	            )
	            .then(function(){
	                return createGroup(webName, "Members", "Members Group", SP.RoleType.editor, members)
	                    .then(function (group) {
	                            return assocGroup(group, "set_associatedMemberGroup");
	                        }
	                    );
	            	}
	            )
	            .then(function(){
	                return createGroup(webName, "Owners", "Owners Group", SP.RoleType.administrator, admins)
	                    .then(function (group) {
	                            return assocGroup(group, "set_associatedOwnerGroup");
	                        }
	                    );
	            	}
	            )
	            .then(function(msg){
    				    var setProperties = { };
						setProperties["Status"] = "Created";
						setProperties["ErrorMessage"] = "";

						return updateMeetingSiteProperties(webName, setProperties)
						.then(oncreateWebsiteSucceeded(webName, displayAlert));
	            	}
	            ).catch(function(msg){
    				    var setProperties = { };
						setProperties["Status"] = "Failed";
						setProperties["ErrorMessage"] = msg;

						return updateMeetingSiteProperties(webName, setProperties)
						.then(oncreateWebsiteFailed(msg));
	            	}
	            );
	},
	
    setMasterPages = function() {
		console.log("in setMasterPages");
    	
    	var masterUrl = _spPageContextInfo.siteServerRelativeUrl + "/_catalogs/masterpage/" + "oslo.master";
    	var customMasterUrl = _spPageContextInfo.siteServerRelativeUrl + "/_catalogs/masterpage/" + "oslo - Meetings.master";

		return AWP.JsomUtils.setMasterPages(web, masterUrl, customMasterUrl);
    },

	
	updateMeetingSiteProperties = function(siteName, properties){
	        console.log("Updating " +  siteName + " properties " + JSON.stringify(properties));
	        	    
			var camlQuery = new SP.CamlQuery();
		    camlQuery.set_viewXml("<View><Query><Where><Eq><FieldRef Name='Title' /><Value Type='Text'>" + siteName + "</Value></Eq></Where></Query></View>");

		    var usefulData = {};
		    var includeFields = "Include(Title)"; 
		    
			return AWP.JsomUtils.getListItemsByListTitleCamlQueryInclude("MeetingSites", camlQuery, properties, includeFields, usefulData)
		    	.then(AWP.JsomUtils.updateListItems);
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

	            return createSingleWeb(webName, webTitle, webdesc, templateGuidName, inheritPermissions);
	        });
        }

		/****************************************************************/
		/* END of Exported functions									*/
		/****************************************************************/
    	
	}
}();


