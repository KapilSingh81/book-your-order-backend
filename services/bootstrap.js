import { roleModel } from "../model/index.js";

export const ROLES = ["owner", "counter", "kitchen"];

/** Teeno roles hamesha maujood rahen (server start par chalta hai, dobara chalane se kuch nahi bigadta) */
export const ensureRoles = async () => {
    for (const name of ROLES) {
        const found = await roleModel.findOne({ where: { name } });
        if (!found) await roleModel.create({ name });
        else if (found.is_deleted || !found.status) await found.update({ is_deleted: false, status: true });
    }
};
