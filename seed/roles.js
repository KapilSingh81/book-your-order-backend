import { roleModel } from "../model/index.js";

export const ROLES = ["owner", "counter", "kitchen"];

/** Teen role hamesha maujood rahenge (login inhi par chalta hai) */
export const seedRoles = async () => {
    for (const name of ROLES) {
        const [role] = await roleModel.findOrCreate({ where: { name }, defaults: { name } });
        if (role.is_deleted || !role.status) await role.update({ is_deleted: false, status: true });
    }
};
