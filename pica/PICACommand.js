
class PICACommand {
	constructor({ register, parameters=[], mask=0 }) {
		this.register = register;
		this.parameters = parameters;
		this.mask = mask;
	}
}
module.exports = { PICACommand };
