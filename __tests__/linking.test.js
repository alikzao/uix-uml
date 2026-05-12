import { linkingMethods } from '../src/js/diagram/linking.js';
import { jest } from '@jest/globals';

describe('diagram linking methods', () => {
  test('resolves built-in link APIs from registry', () => {
    expect(linkingMethods._resolveLinkApi.call({ linkKeys: { api: 'link.api.uml' } })).toEqual({
      create: '/uml/add/link',
      delete: '/uml/delete/link'
    });
    expect(linkingMethods._resolveLinkApi.call({ linkKeys: { api: 'link.api.db' } })).toEqual({
      create: '/db/add/link',
      delete: '/db/delete/link'
    });
    expect(linkingMethods._resolveLinkApi.call({ linkKeys: { api: 'link.api.workflow' } })).toEqual({
      create: '/workflow/add/link',
      delete: '/workflow/delete/link'
    });
  });

  test('falls back to explicit endpoints when registry key is absent', () => {
    const ctx = {
      linkKeys: null,
      createLinkEndpoint: '/custom/create',
      deleteLinkEndpoint: '/custom/delete'
    };

    expect(linkingMethods._resolveLinkApi.call(ctx)).toEqual({
      create: '/custom/create',
      delete: '/custom/delete'
    });
  });

  test('persists a created link and stores returned id', async () => {
    const calls = [];
    global.req = async (url, payload) => {
      calls.push({ url, payload });
      return { id: 'link-1' };
    };

    const ctx = {
      procId: 'pipe-1',
      _resolveLinkApi: linkingMethods._resolveLinkApi,
      linkKeys: { api: 'link.api.workflow' }
    };
    const linkData = {
      source: { node: 'a', field: 'out' },
      target: { node: 'b', field: 'in' }
    };

    await linkingMethods.persistCreatedLink.call(ctx, linkData);

    expect(linkData.id).toBe('link-1');
    expect(calls).toEqual([
      {
        url: '/workflow/add/link',
        payload: {
          pipeId: 'pipe-1',
          link: {
            linkType: 'flow',
            source: { node: 'a', field: 'out' },
            target: { node: 'b', field: 'in' }
          }
        }
      }
    ]);
  });

  test('rolls back local link when persistence fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const linkData = {
      source: { node: 'a', field: 'out' },
      target: { node: 'b', field: 'in' }
    };
    const exitRemove = jest.fn();
    const safeUpdateLinks = jest.fn();

    global.req = async () => {
      throw new Error('network');
    };

    const ctx = {
      procId: 'pipe-1',
      links: [linkData],
      _resolveLinkApi: linkingMethods._resolveLinkApi,
      linkKeys: { api: 'link.api.uml' },
      safeUpdateLinks,
      svg: {
        selectAll() {
          return {
            data() {
              return {
                exit() {
                  return { remove: exitRemove };
                }
              };
            }
          };
        }
      }
    };

    await expect(linkingMethods.persistCreatedLink.call(ctx, linkData)).rejects.toThrow('network');
    expect(ctx.links).toEqual([]);
    expect(exitRemove).toHaveBeenCalledTimes(1);
    expect(safeUpdateLinks).toHaveBeenCalledWith(true);
    expect(consoleError).toHaveBeenCalledWith('persistCreatedLink failed:', expect.any(Error));
    consoleError.mockRestore();
  });
});
