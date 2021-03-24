using System.Linq;
using Umbraco.Core;
using Umbraco.Core.Composing;
using Umbraco.Core.Mapping;
using Umbraco.Core.Persistence.Repositories;
using Umbraco.Web.Actions;
using Umbraco.Web.Trees;

namespace Umbraco.Community.MultilingualTool
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
            bool isSystemFolder = nodeId < 0;

            // for all content tree nodes
            if (!isSystemFolder
                && sender.TreeAlias == "content"
                //&& sender.Security.CurrentUser.Groups.Any(x => x.Alias.InvariantEquals("admin"))
                && permissions.Any(x => x.AssignedPermissions.Contains(ActionUpdate.ActionLetter.ToString())) )
            {
                // creates a action menu item for ADD
                var a = new Umbraco.Web.Models.Trees.MenuItem("multilingualToolAdd", "Add language variants...");
                a.AdditionalData.Add("actionView", "/App_Plugins/Umbraco.Community.multilingualTool/action/add.html");
                a.Icon = "split-alt";
                int idx = e.Menu.Items.FindIndex(x => x.Alias.Equals("assignDomain", System.StringComparison.InvariantCultureIgnoreCase));
                if (idx == -1)
                    idx = 6;
                e.Menu.Items.Insert(idx + 1, a);

                // creates a action menu item for CLEAR
                var c = new Umbraco.Web.Models.Trees.MenuItem("multilingualToolClear", "Clear language variants...");
                c.AdditionalData.Add("actionView", "/App_Plugins/Umbraco.Community.multilingualTool/action/clear.html");
                c.Icon = "filter-arrows";
                idx++;
                e.Menu.Items.Insert(idx + 1, c);
            }
        }

        public void Terminate()
        {
            // unsubscribe on shutdown
            TreeControllerBase.MenuRendering -= TreeControllerBase_MenuRendering;
        }
    }
}
