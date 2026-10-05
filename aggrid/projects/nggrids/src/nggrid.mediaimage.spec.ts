import { describe, it, expect, vi } from 'vitest';
import { ServoyPublicService } from '@servoy/public';
import { getMediaImageCellTag } from './nggrid';

/**
 * SVY-21452: a media dataprovider that holds a Servoy media string should render as an
 * image in the grid (like the SmartClient table-view), without the solution wrapping it
 * in html. getMediaImageCellTag is the shared helper used by datagrid and powergrid
 * cell renderers.
 */
describe('getMediaImageCellTag (SVY-21452)', () => {

    const makeService = (): ServoyPublicService => ({
        // mirrors ApplicationService.generateMediaDownloadUrl at runtime
        generateMediaDownloadUrl: vi.fn((media: string) => {
            if (media && media.indexOf('media://') === 0) {
                media = media.substring(8);
            }
            return 'resources/fs/mySolution' + media;
        })
    } as unknown as ServoyPublicService);

    it('renders a media:/// image string as an <img> with a resolved url', () => {
        const service = makeService();
        const tag = getMediaImageCellTag('media:///foo.png', service);
        expect(tag).toBe('<img class="ag-table-image-cell" src="resources/fs/mySolution/foo.png">');
        expect(service.generateMediaDownloadUrl).toHaveBeenCalledWith('media:///foo.png');
    });

    it('renders an already resolved resources/fs/ image string without re-prefixing it', () => {
        const service = makeService();
        const tag = getMediaImageCellTag('resources/fs/mySolution/foo.png', service);
        expect(tag).toBe('<img class="ag-table-image-cell" src="resources/fs/mySolution/foo.png">');
        // the resolved form must NOT be sent through generateMediaDownloadUrl again
        expect(service.generateMediaDownloadUrl).not.toHaveBeenCalled();
    });

    it('is case-insensitive on the image extension and ignores a query string', () => {
        const service = makeService();
        expect(getMediaImageCellTag('media:///bar.JPG', service))
            .toBe('<img class="ag-table-image-cell" src="resources/fs/mySolution/bar.JPG">');
        expect(getMediaImageCellTag('media:///baz.png?width=10&height=10', service))
            .toBe('<img class="ag-table-image-cell" src="resources/fs/mySolution/baz.png?width=10&height=10">');
    });

    it('accepts all supported image extensions', () => {
        const service = makeService();
        for (const ext of ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico']) {
            expect(getMediaImageCellTag('media:///img.' + ext, service)).not.toBeNull();
        }
    });

    it('returns null for a non-image media string (rendered as text instead)', () => {
        const service = makeService();
        expect(getMediaImageCellTag('media:///doc.pdf', service)).toBeNull();
        expect(getMediaImageCellTag('media:///notes.txt', service)).toBeNull();
    });

    it('returns null for a plain string that is not a media reference', () => {
        const service = makeService();
        expect(getMediaImageCellTag('hello world', service)).toBeNull();
        expect(getMediaImageCellTag('http://example.com/foo.png', service)).toBeNull();
    });

    it('returns null for non-string values (objects, numbers, null, undefined)', () => {
        const service = makeService();
        expect(getMediaImageCellTag({ url: 'x', contentType: 'image/png' }, service)).toBeNull();
        expect(getMediaImageCellTag(42, service)).toBeNull();
        expect(getMediaImageCellTag(null, service)).toBeNull();
        expect(getMediaImageCellTag(undefined, service)).toBeNull();
    });

    it('returns null when the service cannot resolve a url', () => {
        const service = {
            generateMediaDownloadUrl: vi.fn(() => null)
        } as unknown as ServoyPublicService;
        expect(getMediaImageCellTag('media:///foo.png', service)).toBeNull();
    });
});
