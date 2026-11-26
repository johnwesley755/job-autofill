import { FormAdapter } from './types';
import { GoogleFormsAdapter } from './googleForms/googleFormsAdapter';
import { MicrosoftFormsAdapter } from './microsoftForms/microsoftFormsAdapter';
import { ZohoFormsAdapter } from './zohoForms/zohoFormsAdapter';
import { ZohoRecruitAdapter } from './zohoRecruit/zohoRecruitAdapter';
import { KekaAdapter } from './keka/kekaAdapter';

export class AdapterRegistry {
  private adapters: FormAdapter[] = [];

  constructor() {
    this.register(new GoogleFormsAdapter());
    this.register(new MicrosoftFormsAdapter());
    this.register(new ZohoFormsAdapter());
    this.register(new ZohoRecruitAdapter());
    this.register(new KekaAdapter());
  }

  public register(adapter: FormAdapter): void {
    this.adapters.push(adapter);
  }

  public findAdapter(url: string, document: Document): FormAdapter | null {
    for (const adapter of this.adapters) {
      if (adapter.canHandle(url, document)) {
        return adapter;
      }
    }
    return null;
  }
}

export const adapterRegistry = new AdapterRegistry();
