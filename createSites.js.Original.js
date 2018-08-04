<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">

<head>

<script src="http://internal.css.local/test/AWP/SiteAssets/scripts/jquery-3.1.1.min.js"></script>

</head>

<body>
    <div class="form-group required">
        <label for="SiteNameLabel" class="col-sm-4 control-label">Site Name</label>
            <div class="input-group">
              <input id="SiteName" type="text" class="form-control">
              <span class="input-group-btn">
                <button id="CreateSiteBtn" class="btn btn-default" type="button">Create</button>
              </span>
            </div>
    </div>

</body>

<script >

function createWeb(weburl, webname, webdesc, template, inheritBool) {
    var latestNewWeb,
        latestNewGroup,
        clientContext = new SP.ClientContext.get_current(),
        defaultCallback = oncreateWebsiteSucceeded,
        parentWeb = clientContext.get_web(),
        collWeb = parentWeb.get_webs(),
        webCreationInfo = new SP.WebCreationInformation();

    webCreationInfo.set_title(webname);
    webCreationInfo.set_url(weburl);
    webCreationInfo.set_description(webdesc);
    webCreationInfo.set_webTemplate(template);
    webCreationInfo.set_useSamePermissionsAsParentSite(inheritBool);
    latestNewWeb = collWeb.add(webCreationInfo);
    if (!inheritBool) {
        defaultCallback = createDefaultGroups;
    }
    parentWeb.update();
    clientContext.executeQueryAsync(defaultCallback, oncreateWebsiteFailed);

    function createDefaultGroups() {
        createVisitors();
        // all other group creations will occur as callbacks;
    }

    function createVisitors() {
        createGroup(
            "Visitors", "Visitors Group",
            SP.RoleType.reader, "set_associatedVisitorGroup",
            createMembers, oncreateWebsiteFailed
        );
    }

    function createMembers() {
        createGroup(
            "Members", "Members Group",
            SP.RoleType.contributor, "set_associatedMemberGroup",
            createOwners, oncreateWebsiteFailed
        );
    }

    function createOwners() {
        createGroup(
            "Owners", "Owners Group",
            SP.RoleType.administrator, "set_associatedOwnerGroup",
            oncreateWebsiteSucceeded, oncreateWebsiteFailed
        );
    }

    function createGroup(title, description, SPRoleType, assocFn, callbackOk, callbackHell) {

        var groupCreationInfo = new SP.GroupCreationInformation(),
            collRoleDefinitionBinding,
            oRoleDefinition,collRollAssignment;

        groupCreationInfo.set_title(webname + " " + title);
        groupCreationInfo.set_description(description);
        latestNewGroup = latestNewWeb.get_siteGroups().add(groupCreationInfo);
        collRoleDefinitionBinding = SP.RoleDefinitionBindingCollection.newObject(clientContext);
        oRoleDefinition = latestNewWeb.get_roleDefinitions().getByType(SPRoleType);
        collRoleDefinitionBinding.add(oRoleDefinition);
        collRollAssignment = latestNewWeb.get_roleAssignments();
        collRollAssignment.add(latestNewGroup, collRoleDefinitionBinding);
        clientContext.load(latestNewGroup);
        clientContext.load(oRoleDefinition, 'Name');

        clientContext.executeQueryAsync(
            function () {
                assocGroup(assocFn, callbackOk, callbackHell)
            },
            callbackHell
        );
    }

    function assocGroup(assocFn, callbackOk, callbackHell) {
        latestNewWeb[assocFn](latestNewGroup);
        latestNewWeb.update();
        clientContext.executeQueryAsync(callbackOk, callbackHell);
    }

    function oncreateWebsiteSucceeded() {
        alert("Created Web site: " + weburl);
    }

    function oncreateWebsiteFailed(sender, args) {
        alert('Fail. ' + weburl + " --- " + args.get_message() + '\n' + args.get_stackTrace());
    }
}

	$(document).ready(function(){
		$("#CreateSiteBtn").click(function() {
			var siteName = $("#SiteName").val(),
                weburl = siteName,
                webname = siteName,
                webdesc = "My site description",
                inheritBool = false,
                template ='STS#0';

                createWeb(weburl, webname, webdesc, template, inheritBool);
			
		});
	});
	
	
</script>

</html>
