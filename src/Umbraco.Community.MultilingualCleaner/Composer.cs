using System.Linq;
using Umbraco.Core;
using Umbraco.Core.Composing;
using Umbraco.Core.Mapping;
using Umbraco.Core.Persistence.Repositories;
using Umbraco.Web.Trees;

namespace Umbraco.Community.MultilingualCleaner
{
    public class Composer : IUserComposer
    {
        public void Compose(Composition composition)
        {

            composition.Components().Append<TreeExtensionComponent>();
        }
    }
}