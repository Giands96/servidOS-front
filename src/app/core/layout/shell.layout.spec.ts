import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { aMe } from '../../../testing/builders';
import { routeAccess } from '../auth/domain/navigation.rules';
import { SessionStore } from '../auth/session.store';
import { ShellLayout } from './shell.layout';

@Component({ selector: 'app-dummy-page', template: 'page' })
class DummyPage {}

describe('ShellLayout top bar (below lg)', () => {
  let harness: RouterTestingHarness;
  let scrolled: Element[];
  const originalScrollIntoView = Element.prototype.scrollIntoView;

  beforeEach(async () => {
    // jsdom has no layout engine: record which element was asked to scroll into view.
    scrolled = [];
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this);
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: '',
            component: ShellLayout,
            children: [
              {
                path: 'pedidos',
                component: DummyPage,
                data: routeAccess({ action: 'pedidos.gestionar', nav: { label: 'Pedidos', icon: 'receipt' } }),
              },
              {
                path: 'cocina',
                component: DummyPage,
                data: routeAccess({ action: 'cocina.ver', nav: { label: 'Cocina', icon: 'flame' } }),
              },
            ],
          },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    TestBed.inject(SessionStore).setUser(aMe({ rol: 'ADMINISTRADOR', nombre: 'Marta Rivas' }));
    harness = await RouterTestingHarness.create('/pedidos');
    await settle();
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  const root = () => harness.fixture.nativeElement as HTMLElement;
  const pills = () => [...root().querySelectorAll<HTMLAnchorElement>('app-top-bar nav a')];
  const avatar = () => root().querySelector<HTMLButtonElement>('app-top-bar button[aria-haspopup="menu"]')!;
  const menu = () => root().querySelector<HTMLElement>('app-top-bar [role="menu"]');
  const logoutItem = () => menu()!.querySelector<HTMLButtonElement>('[role="menuitem"]')!;
  const isExpanded = () => avatar().getAttribute('aria-expanded') === 'true';

  /** Lets router/rendering settle and re-renders (focus moves and scrolling happen after the next render). */
  const settle = async () => {
    await harness.fixture.whenStable();
    harness.detectChanges();
  };
  const click = async (el: HTMLElement) => {
    el.click();
    await settle();
  };
  const pressEscape = async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();
  };

  it('renders one pill per nav item, with its label and link, from the same items as the sidebar', () => {
    expect(pills().map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['Pedidos', '/pedidos'],
      ['Cocina', '/cocina'],
    ]);
    expect(root().querySelectorAll('aside nav a')).toHaveLength(pills().length);
  });

  it('shows the restaurant fallback name and the user initials in the bar', () => {
    const bar = root().querySelector('app-top-bar')!;
    expect(bar.textContent).toContain('ServidOS');
    expect(bar.textContent).toContain('Mi restaurante');
    expect(avatar().textContent?.trim()).toBe('MR');
  });

  it('starts with the user menu closed and the avatar labelled', () => {
    expect(isExpanded()).toBe(false);
    expect(avatar().getAttribute('aria-label')).toBe('Menú de usuario');
    expect(menu()).toBeNull();
  });

  it('opens the user menu from the avatar, showing name, role and the logout action', async () => {
    await click(avatar());
    expect(isExpanded()).toBe(true);
    expect(menu()).not.toBeNull();
    const card = menu()!.parentElement!.textContent ?? '';
    expect(card).toContain('Marta Rivas');
    expect(card).toContain('Administrador');
    expect(logoutItem().textContent).toContain('Cerrar sesión');
    expect(document.activeElement).toBe(logoutItem());
  });

  it('closes the menu when the avatar is pressed again', async () => {
    await click(avatar());
    await click(avatar());
    expect(isExpanded()).toBe(false);
    expect(menu()).toBeNull();
  });

  it('closes on Escape and returns focus to the avatar', async () => {
    await click(avatar());
    await pressEscape();
    expect(isExpanded()).toBe(false);
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(avatar());
  });

  it('ignores Escape while closed and leaves focus alone', async () => {
    const before = document.activeElement;
    await pressEscape();
    expect(isExpanded()).toBe(false);
    expect(document.activeElement).toBe(before);
  });

  it('closes on a click outside the menu', async () => {
    await click(avatar());
    await click(root().querySelector('main')!);
    expect(isExpanded()).toBe(false);
    expect(menu()).toBeNull();
  });

  it('stays open when the user info inside the menu is clicked', async () => {
    await click(avatar());
    await click(menu()!.parentElement!.querySelector('p')!);
    expect(isExpanded()).toBe(true);
    expect(menu()).not.toBeNull();
  });

  it('closes after a navigation', async () => {
    await click(avatar());
    await TestBed.inject(Router).navigateByUrl('/cocina');
    await settle();
    expect(isExpanded()).toBe(false);
    expect(menu()).toBeNull();
  });

  it('logs out through the session and goes to /login when "Cerrar sesión" is chosen', async () => {
    const logout = vi.spyOn(TestBed.inject(SessionStore), 'logout').mockResolvedValue();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await click(avatar());
    await click(logoutItem());
    expect(logout).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/login');
    expect(menu()).toBeNull();
  });

  it('scrolls the active pill into view on first render', () => {
    expect(scrolled).toContain(pills()[0]);
  });

  it('scrolls the newly active pill into view after a navigation', async () => {
    scrolled.length = 0;
    await TestBed.inject(Router).navigateByUrl('/cocina');
    await settle();
    expect(scrolled).toEqual([pills()[1]]);
  });
});
