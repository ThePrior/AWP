<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">

<head>

    <script src="http://internal.css.local/test/AWP/SiteAssets/scripts/jquery-3.1.1.min.js"></script>

</head>

<body>
    <div class="form-group required">
        <label for="SiteNameLabel" class="col-sm-4 control-label">Site Name</label>
        <div class="input-group">
            <input type="text" id="SiteName" class="form-control" value="Test1" /></input>
            <span class="input-group-btn">
                <button id="CreateSiteBtn" class="btn btn-default" type="button">Create</button>
            </span>
        </div>
    </div>

</body>

<script>

window.AWP = window.AWP || {};
window.AWP.CreateSite = function () {
    var context,
        web;

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
        user = web.ensureUser('spFEPuser');
		//user = web.ensureUser('spFEPuserXXX');
        var userCollection = newGroup.get_users();
        userCollection.addUser(user);

        context.load(user);
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


    oncreateWebsiteSucceeded = function (webName) {
        alert("Created Web site: " + webName);
    },

    oncreateWebsiteFailed = function (webName, msg) {
        alert('Fail. ' + webName + " --- " + msg);
    },

    logError = function(error) {
        console.log('An error occured: ' + error);
    }

    return {

        execute: function(webName, webTitle, webdesc, template, inheritPermissions) {

            context = new SP.ClientContext.get_current();

            createWeb(webName, webTitle, webdesc, template, inheritPermissions)
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
            		return oncreateWebsiteSucceeded(webName);
            	}
            ).catch(function(msg){
            		return oncreateWebsiteFailed(webName, msg);
            	}
            );
        }
    };

} ();

	$(document).ready(function(){

		$("#CreateSiteBtn").click(function() {

			var siteName = $("#SiteName").val(),
                webName = siteName,
                webTitle = siteName,
                webdesc = "My site description",
                inheritPermissions = false,
                template ='STS#0';

                window.AWP.CreateSite.execute(webName, webTitle, webdesc, template, inheritPermissions);

		});
	});


</script>

</html>
