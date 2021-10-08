const { Collection } = require("./Collection");
const { Tag } = require("./Tag");
const { Category } = require("./Category");
const { User } = require("./User");
const { Build } = require("./Build");

User.belongsToMany(Build, { through: 'favorites', as: 'favorite' });
Build.belongsToMany(User, { through: 'favorites', as: 'favorite' });

User.hasOne(Build, { as: 'creator' });
Build.belongsTo(User, { as: 'creator' })

User.belongsToMany(Build, { through: 'saves', as: 'save' });
Build.belongsToMany(User, { through: 'saves', as: 'save' });

Collection.hasMany(Build);
Build.belongsTo(Collection);

Category.hasMany(Build, { as: 'category' });
Build.belongsTo(Category, { as: 'category' });

// Tag.hasMany(Build);
// Build.belongsTo(Tag);

module.exports = {
    Build,
    User,
    Tag,
    Collection,
    Category,
}
