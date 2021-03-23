using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

using Umbraco.Web.WebApi;
using Umbraco.Web.Editors;
using Umbraco.Web;
using Umbraco.Core.Services;


namespace Umbraco.Community.MultilingualCleaner.Controllers
{
    [Umbraco.Web.Mvc.PluginController("MultilingualCleaner")]
    public class ContentController : UmbracoAuthorizedJsonController
    {
        private IContentService _contentService;
        public ContentController(IContentService contentService)
        {
            _contentService = contentService;
        }
        public List<int> GetDescendantIds(int nodeId)
        {
            List<int> nodes = new List<int>();

            nodes.Add(nodeId);

            long count = 0;
            var descendants = _contentService.GetPagedDescendants(nodeId, 0, 99999999, out count);
            foreach (var node in descendants)
            {
                try
                {
                    nodes.Add(node.Id);
                }
                catch { }
            }

            return nodes;
        }
    }
}