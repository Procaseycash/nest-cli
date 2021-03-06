import {ModuleUpdater} from '../../../../common/asset/interfaces/module.updater.interface';
import {ModuleUpdaterImpl} from '../module.updater';
import * as sinon from 'sinon';
import {LoggerService} from '../../../logger/logger.service';
import {BufferedReadable, BufferedWritable} from '../../streams/tests/test.utils';
import {ModuleFinderImpl} from '../../module-finders/module.finder';
import * as fs from 'fs';
import {FileSystemUtils} from '../../../utils/file-system.utils';
import {expect} from 'chai';
import {AssetEnum} from '../../../../common/asset/enums/asset.enum';
import {Asset} from '../../../../common/asset/interfaces/asset.interface';
import * as path from 'path';

describe('ModuleUpdaterImpl', () => {
  let sandbox: sinon.SinonSandbox;
  beforeEach(() => sandbox = sinon.sandbox.create());
  afterEach(() => sandbox.restore());

  beforeEach(() => sandbox.stub(LoggerService, 'getLogger').callsFake(() => {
    return {
      info: () => {}
    };
  }));

  let reader: BufferedReadable;
  let intermediateWriter: BufferedWritable;
  let intermediateReader: BufferedReadable;
  let writer: BufferedWritable;
  beforeEach(() => {
    const content: string =
      'import {Module} from \'@nestjs/common\';\n' +
      '\n' +
      '@Module({})\n' +
      'export class AssetModule {}\n';
    reader = new BufferedReadable(Buffer.from(content));
    intermediateWriter = new BufferedWritable();
    intermediateReader = new BufferedReadable(Buffer.from(content));
    writer = new BufferedWritable();
  });

  let findFromStub: sinon.SinonStub;
  let createReadStreamStub: sinon.SinonStub;
  let createWriteStream: sinon.SinonStub;
  let rmStub: sinon.SinonStub;
  beforeEach(() => {
    findFromStub = sandbox.stub(ModuleFinderImpl.prototype, 'findFrom');
    createReadStreamStub = sandbox.stub(fs, 'createReadStream').callsFake(filename => {
      return /.lock/.test(filename) ? intermediateReader : reader;
    });
    createWriteStream = sandbox.stub(fs, 'createWriteStream').callsFake(filename => {
      return /.lock/.test(filename) ? intermediateWriter : writer;
    });
    rmStub = sandbox.stub(FileSystemUtils, 'rm').callsFake(() => Promise.resolve());
  });

  describe('#update()', () => {
    let updater: ModuleUpdater;
    beforeEach(() => updater = new ModuleUpdaterImpl());

    const moduleFilename: string = path.join(process.cwd(), 'src/app', 'app.module.ts');
    const asset: Asset = {
      type: AssetEnum.CONTROLLER,
      filename: path.join(
        process.cwd(),
        'src/app',
        'controllers',
        'name.controller.ts'
      ),
      className: 'NameController',
      template: {
        filename: path.resolve(__dirname, '../../../../assets/ts/controller/controller.ts.template'),
        replacer: {
          __CLASS_NAME__: 'NameController',
          __DIR_NAME__: '\'./controllers/name.controller\''
        }
      }
    };

    it('should read the module filename', () => {
      return updater.update(moduleFilename, asset)
        .then(() => {
          sinon.assert.calledWith(createReadStreamStub, moduleFilename);
        });
    });

    it('should update the module filename content', () => {
      return updater.update(moduleFilename, asset)
        .then(() => {
          expect(intermediateWriter.getBuffer().toString()).to.be.equal(
            'import {Module} from \'@nestjs/common\';\n' +
            `import {${ asset.className }} from './controllers/name.controller';\n` +
            '\n' +
            '@Module({\n' +
            '  controllers: [\n' +
            `    ${ asset.className }\n` +
            '  ]\n' +
            '})\n' +
            'export class AssetModule {}\n'
          );
        });
    });

    it('should write the updated file content in a intermediate lock file', () => {
      return updater.update(moduleFilename, asset)
        .then(() => {
          sinon.assert.calledWith(createWriteStream, `${ moduleFilename }.lock`);
        });
    });

    it('should write the updated module filename', () => {
      return updater.update(moduleFilename, asset)
        .then(() => {
          sinon.assert.calledWith(createWriteStream, moduleFilename);
        });
    });

    it('should delete the lock file when write is ended', () => {
      return updater.update(moduleFilename, asset)
        .then(() => {
          sinon.assert.calledOnce(rmStub);
        });
    });
  });
});
