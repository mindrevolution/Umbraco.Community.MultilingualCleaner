using System.Linq;
using Umbraco.Core;
using Umbraco.Core.Composing;
using Umbraco.Core.Mapping;
using Umbraco.Core.Persistence.Repositories;
using Umbraco.Web.Actions;
using Umbraco.Web.Trees;

namespace Umbraco.Community.MultilingualCleaner
{
     public class TreeExtensionComponent : IComponent
    {
        public void Initialize()
        {
            TreeControllerBase.MenuRendering += TreeControllerBase_MenuRendering;
        }

        void TreeControllerBase_MenuRendering(TreeControllerBase sender, MenuRenderingEventArgs e)
        {
            int nodeId = -1;
            int.TryParse(e.NodeId, out nodeId);

            var permissions = sender.Services.UserService.GetPermissions(sender.Security.CurrentUser, nodeId);
            bool isRecycleBin = nodeId.Equals(Constants.System.RecycleBinContentString);

            // for all content tree nodes
            if (!isRecycleBin
                && sender.TreeAlias == "content"
                //&& sender.Security.CurrentUser.Groups.Any(x => x.Alias.InvariantEquals("admin"))
                && permissions.Any(x => x.AssignedPermissions.Contains(ActionUpdate.ActionLetter.ToString())) )
            {
                // creates a menu action that will open /umbraco/currentSection/itemAlias.html
                var i = new Umbraco.Web.Models.Trees.MenuItem("multilingualCleaner", "Clear language variants...");
                i.AdditionalData.Add("actionView", "/App_Plugins/Umbraco.Community.MultilingualCleaner/action/view.html");
                i.Icon = "defrag";

                // insert at index 5
                //e.Menu.Items.Insert(5, i);
                int idx = e.Menu.Items.FindIndex(x => x.Alias.Equals("assignDomain", System.StringComparison.InvariantCultureIgnoreCase));
                if (idx == -1)
                    idx = 6;
                e.Menu.Items.Insert(idx+1, i);
            }
        }

        public void Terminate()
        {
            // unsubscribe on shutdown
            TreeControllerBase.MenuRendering -= TreeControllerBase_MenuRendering;
        }
    }
}
