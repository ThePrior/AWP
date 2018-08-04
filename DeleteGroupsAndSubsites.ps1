# TODO: DO THIS BIT LAST AND USE SITE NAME TO COMPOSE GROUP NAME?

$spWeb = Get-SPWeb "http://internal.css.local/test/AWP"
$spGroups = $spWeb.SiteGroups

Write-Host "This site has" $spGroups.Count "groups"

$doNotDeleteGroupNames = ("Everyone", "AWP Members", "AWP Owners", "AWP Visitors")

$groups = $spGroups | ? {$_.Name -notin $doNotDeleteGroupNames}
Write-Host "Found" $groups.Count "groups which will be deleted:"

ForEach($group in $groups) {
   Write-Host "Deleting" $group.Name "..."
   $spGroups.Remove($group.Name) 
}

$spWeb.Dispose()

###################################################################
#
# Delete subsites of given site
#
###################################################################

#Site URL
$ParentWebURL="http://internal.css.local/test/AWP"

#Custom Function to Delete subsite recursively
function Remove-SPWebRecursively([Microsoft.SharePoint.SPWeb] $web, [bool]$IncludeStartWeb)
{
    $ChildWebsColl = $web.webs
    
    foreach($ChildWeb in $ChildWebsColl)
    {
        #Call the function recursively
        Remove-SPWebRecursively $ChildWeb $true
		$ChildWeb.Dispose()
    }
    
    #Remove the web  
	if ($IncludeStartWeb)
	{
		Write-host "Removing Web $($web.Url)..."
		Remove-SPWeb $web -Confirm:$true
	}
}

$ParentWeb = Get-SPWeb $ParentWebURL

#Call the function to remove subsite
Remove-SPWebRecursively $ParentWeb $false

#https://duongtuanan.wordpress.com/2015/09/24/how-to-delete-subsites-in-sharepoint-using-powershell/
