import { Op } from "sequelize";
import ResponseService from "../utils/httpService.js";
import { roleModel } from "../model/roleModel.js";

const Create = async (req, res) => {
    try {
        const { name, status } = req.body;
        if (!name || !name.trim()) {
            return ResponseService.badRequest(res, 'Role name is required');
        }

        const checkRole = await roleModel.findOne({
            where: { name: name.trim(), is_deleted: false },
        });
        if (checkRole) {
            return ResponseService.badRequest(res, 'Role already exist');
        }

        const role = await roleModel.create({
            name: name.trim(),
            status: status ?? true,
        });
        return ResponseService.created(res, role, 'Role created successfully');
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const List = async (req, res) => {
    try {
        const roles = await roleModel.findAll({
            where: { is_deleted: false },
            order: [['id', 'DESC']],
        });
        return ResponseService.success(res, 'Success', roles);
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return ResponseService.badRequest(res, 'Role id is required');

        const role = await roleModel.findOne({
            where: { id, is_deleted: false },
        });
        if (!role) return ResponseService.notFound(res, 'Role not found');

        const { name, status } = req.body;
        if (!name || !name.trim()) {
            return ResponseService.badRequest(res, 'Role name is required');
        }

        const duplicate = await roleModel.findOne({
            where: { name: name.trim(), is_deleted: false, id: { [Op.ne]: id } },
        });
        if (duplicate) {
            return ResponseService.badRequest(res, 'Role name already exist');
        }

        await role.update({
            name: name.trim(),
            status: status ?? role.status,
        });
        return ResponseService.success(res, 'Role updated successfully', role);
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const deleteRole = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return ResponseService.badRequest(res, 'Role id is required');

        const role = await roleModel.findOne({
            where: { id, is_deleted: false },
        });
        if (!role) return ResponseService.notFound(res, 'Role not found');

        await role.update({ is_deleted: true });
        return ResponseService.success(res, 'Role deleted successfully');
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

export { Create, List, update, deleteRole };