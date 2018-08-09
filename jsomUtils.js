window.AWP = window.AWP || {};

/*********************************************************************************/
// General JSOM Utility Functions
/*********************************************************************************/

window.AWP.JsomUtils = function () {
	return {

        getListItemsByListTitleCamlQueryInclude: function (listTitle, camlQuery, properties, includeFields, usefulData) {
        	console.log("in getListItemsByListTitleCamlQueryInclude");
        	var ctx = SP.ClientContext.get_current();
		    var list = ctx.get_web().get_lists().getByTitle(listTitle);
		    var items = list.getItems(camlQuery);
		    var dfd = $.Deferred();
		
			if (includeFields !== null){
			    ctx.load(items, includeFields);
			}else{
				ctx.load(items);
			}
			
		    ctx.executeQueryAsync(function () {
		        dfd.resolve(items, properties, usefulData);
		    },
		    function (sender, args) {
		        dfd.reject(args.get_message(), usefulData);
		    });
		    return dfd.promise();
        },
        
        updateListItems: function (items, itemProperties) {
		    var deferred = $.Deferred();
		    var ctx = items.get_context();
		
		    //prepare to update list items 
		    var itemCount = 0;
		    items.get_data().forEach(function (item) {
		        itemCount++;
		        for (var propName in itemProperties) {
		            item.set_item(propName, itemProperties[propName])
		        }
		        item.update();
		    });
		    
		    console.log("updateListItems: updating " + itemCount + " items");

		    //submit request
		    ctx.executeQueryAsync(function () {
		        deferred.resolve(itemCount + ' item(s) updated'); //TODO: items not needed here ("updated" with a count would be better)
		    },
		    function (sender, args) {
		        deferred.reject(args.get_message());
		    });
		    return deferred.promise();
		},

        getTemplateName: function(templateName) {	
        	console.log("in getTemplateNamegetTemplateName: template = " + templateName);
		    var dfd = new $.Deferred(); 
			var context = new SP.ClientContext.get_current();
		   	
		   	var templates = context.get_web().getAvailableWebTemplates(1033, false);
		    context.load(templates);
		
		    context.executeQueryAsync(
		    	function() {
		            var templateGuidName = null;
		            var templateTitle;
		            var item;
		            
		           	templates.get_data().forEach(function (template) {
		           		templateTitle = template.get_title();
		           		//console.log(templateTitle);
		           		if (templateTitle === templateName){
		           			templateGuidName  = template.get_name();
							console.log("Found!! -- " + template.get_title());
						}
		           		
					});
					
					if (templateGuidName !== null) {
			        	dfd.resolve(templateGuidName);
			        } else {
			        	dfd.reject("template name: '" + templateName + "' not found in available templates");
		        	}
		        }, 
	        	function(sender, args) { 
	        		dfd.reject(args.get_message()); 
	        		}
	        	);
	
		    return dfd.promise();
	    },
	    

	    breakListPermissionsInheritance: function(listTitle, copyRoleAssignments, clearSubScopes) {	
        	console.log("in breakPermissionsInheritance: listTitle= " + listTitle);
		    var dfd = new $.Deferred(); 

			var context = new SP.ClientContext.get_current(),
	        	web = context.get_web(),		
				list = web.get_lists().getByTitle(listTitle);

		    list.breakRoleInheritance(copyRoleAssignments, clearSubScopes);
	    	list.update();
			context.load(list);	
//			context.load(web, 'Title');		
			
		    context.executeQueryAsync(
		    	function() {
		        	dfd.resolve(); 
		        	}, 
	        	function(sender, args) { 
	        		dfd.reject(args.get_message()); 
	        		}
	        	);
	
		    return dfd.promise();
	    },
   
	    addGroupPermissionsToList: function(listTitle, groupName, role) {	
        	console.log("in addGroupPermissionsToList: listTitle = " + listTitle + ", groupName= " + groupName + ", role = " + role);
		    var dfd = new $.Deferred(); 
		    
			var context = new SP.ClientContext.get_current(),
	        	web = context.get_web(),		
				list = web.get_lists().getByTitle(listTitle),
		   		group = context.get_web().get_siteGroups().getByName(groupName),
		   		groupRoles = SP.RoleDefinitionBindingCollection.newObject(context);

			groupRoles.add(web.get_roleDefinitions().getByType(role));

			var listRoleAssignments = list.get_roleAssignments();
	    	listRoleAssignments.add(group, groupRoles);

	    	group.update();
		   	
	        context.load(web); 
	        context.load(group); 
	        context.load(list);		

		    context.executeQueryAsync(
		    	function() {
    		console.log("addGroupPermissionsToList: listTitle = " + listTitle + " success");			
		        	dfd.resolve(); 
		        	}, 
	        	function(sender, args) { 
	        		dfd.reject(groupName + ": " + args.get_message()); 
	        		}
	        	);
	
		    return dfd.promise();
	    },
	    
	    getGroupIdByName: function(groupName, groupId) {	
        	console.log("in getGroupIdByName: groupName= " + groupName);
		    var dfd = new $.Deferred(); 
			var context = new SP.ClientContext.get_current();
		   	
		   	var group = context.get_web().get_siteGroups().getByName(groupName);
			context.load(group);		
			
		    context.executeQueryAsync(
		    	function() {
		    		console.log("id = " + group.get_id());
		        	dfd.resolve(group.get_id()); 
		        	}, 
	        	function(sender, args) { 
	        		dfd.reject(args.get_message()); 
	        		}
	        	);
	
		    return dfd.promise();
	    },
	       
	    setMasterPages: function(web, masterUrl, customMasterUrl) {
	    	
	    	// e.g. /sites/Meetings/_catalogs/masterpage/oslo - Meetings.master
	    	
	    	console.log("in setMasterPages: masterUrl= " + masterUrl + ", customMasterUrl = " + customMasterUrl );
	    	
		    var dfd = new $.Deferred(); 
	    
			var context = new SP.ClientContext.get_current();
		   	
		   	web = web || context.get_web();
		   	
		   	web.set_customMasterUrl(customMasterUrl);
		   	web.set_masterUrl(masterUrl);
            web.update();
            context.load(web);
		
		    context.executeQueryAsync(
		    	function() {
		    		console.log("master pages set OK");
					dfd.resolve(); 
		        	}, 
	        	function(sender, args) { 
		    		console.log("master pages set FAILED");
	        		dfd.reject(args.get_message()); 
	        		}
	        	);
	
		    return dfd.promise();
	    },
	    
	    handleErrorToUser: function(sender, args) {
	    	var error = args.get_message();
		    console.log('An error occured: ' + error);
		    alert('An error occured: ' + error);
	    },
	    
	    logError: function(error) {
		    console.log('An error occured: ' + error);
		},
		
		logErrorToUser: function(error) {
		    console.log('An error occured: ' + error);
		    alert('An error occured: ' + error);
		},
		
		logMessageToUser: function(msg) {
		    console.log('in logMessageToUser: ' + msg);
		    alert(msg);
		},


		
		getWebNameFromServerRelativeUrl: function(url){
			var lastSlash = _spPageContextInfo.webServerRelativeUrl.lastIndexOf('/');
			return _spPageContextInfo.webServerRelativeUrl.substr(lastSlash + 1);
		},

    }       

}();
