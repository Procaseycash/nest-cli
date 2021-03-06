import {Command} from '../../common/program/interfaces/command.interface';
import {GenerateCommandHandler} from '../handlers/generate-command.handler';
import {CommandDescriptor} from '../../common/program/interfaces/command.descriptor.interface';

export class GenerateCommandDescriptor implements CommandDescriptor {
  constructor(
    private _handler = new GenerateCommandHandler()
  ) {}

  public describe(command: Command): void {
    command
      .alias('g')
      .argument('<assetType>', 'The generated asset type')
      .argument('<assetName>', 'The generated asset name')
      .argument('[moduleName]', 'The module name where the asset will be declared in')
      .handler(this._handler);
  }
}
