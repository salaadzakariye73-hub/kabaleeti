import { createContext, useContext, useState } from 'react';

// Somali (default) and English. Every key must exist in both languages.
// t('key') falls back to English, then to the key itself.
const SO = {
  dashboard: 'Dashboard', inventory: 'Alaabta', customers: 'Macaamiisha', rentals: 'Kirada & Soo celinta',
  invoices: 'Invoices', payments: 'Lacagaha', finance: 'Kharashaadka & Damage', admin: 'Users & Settings',
  logout: 'Ka bax', search: 'Raadi...', save: 'Keydi', cancel: 'Jooji', edit: 'Wax ka beddel',
  login: 'Gali', email: 'Email', password: 'Furaha sirta ah', name: 'Magaca', phone: 'Telefoon',
  total: 'Wadarta', balance: 'Harsan', paid: 'La bixiyey', status: 'Xaaladda', actions: 'Falal',
  qty: 'Tirada', rate: 'Qiimaha maalintii', start: 'Bilaabid', end: 'Dhammaad la filayo', date: 'Taariikhda',
  amount: 'Lacagta', method: 'Habka bixinta', reference: 'Tixraac', notes: 'Qoraal', product: 'Alaab',
  productsCol: 'Alaabta', customer: 'Macmiil', project: 'Mashruuc', deposit: 'Deposit', return: 'Soo celin',
  returnDate: 'Taariikhda soo celinta', recordPayment: 'Diiwaangeli lacag bixin', newRental: 'Kiro cusub',
  newSale: 'Iib cusub', addProduct: 'Ku dar alaab', addCustomer: 'Ku dar macmiil', addUser: 'Ku dar user',
  restock: 'Ku dar stock', available: 'La heli karo', rented: 'La kiraystay', sold: 'La iibiyey',
  damaged: 'Dhaawacan', lost: 'Luntay', inventory_total: 'Wadarta kaydka', monthRent: 'Kirada bishan',
  salesRevenue: 'Dakhliga iibka', outstanding: 'Lacag harsan', expenses: 'Kharashaadka', profit: "Faa'iido la qiyaasay",
  upcoming: 'Soo celin dhow (7 maalmood)', overdue: 'Dib u dhac', lowStock: 'Stock hooseeya', active: 'Socota',
  activeRentals: 'Kiro socota', partial: 'Qayb soo celin', completed: 'Dhammaatay', open: 'Furan',
  expenseTab: 'Kharashaadka', damageTab: 'Damage / Luntay', reportsTab: 'Warbixinno', exportCsv: 'Soo dejiso CSV',
  addExpense: 'Ku dar kharash', recordDamage: 'Diiwaangeli damage', resolve: 'Xallin', reopen: 'Dib u fur',
  users: 'Isticmaalayaasha', settings: 'Dejinta', companyName: 'Magaca shirkadda', company: 'Shirkad',
  address: 'Cinwaanka', currency: 'Lacagta', graceDays: 'Maalmaha grace', role: 'Doorka', active_status: 'Xaalad',
  saved: 'Waa la keydiyey', noData: 'Xog ma jirto', allFilter: 'Dhammaan', unpaid: 'Aan la bixin',
  responsibility: "Mas'uulka", cost: 'Kharashka', reason: 'Sababta', type: 'Nooca', none: 'Ma jiro',
  identificationNo: 'Aqoonsiga (ID)', sku: 'SKU', size: 'Cabbirka', unit: 'Unit', warehouse: 'Bakhaarka',
  dailyRate: 'Kirada maalintii', sellPrice: 'Qiimaha iibka', purchaseCost: 'Qiimaha iibsiga',
  openingQty: 'Tirada bilowga', category: 'Qaybta', docNo: 'Lambar', invoiceNo: 'Invoice', openQty: 'Weli kiran',
  price: 'Qiimaha', discount: 'Discount', taxPct: 'Tax %', selectDoc: 'Dooro dokumentiga', rentalsTab: 'Kiro',
  goodUnits: 'Wanaagsan', damagedUnits: 'Dhaawacan', remaining: 'Harsan', lineDays: 'Maalmaha',
  totalPreview: 'Qiyaasta wadarta', collected: 'Lacagta la helay', rentalRev: 'Dakhliga kirada', net: "Faa'iido saafi ah",
  cash: 'Lacag caddaan', bank: 'Bank Transfer', mobile: 'Mobile Money',
  transport: 'Gaadiid', repair: 'Dayactir', salary: 'Mushahar', warehouseRent: 'Kirada bakhaarka', other: 'Kale',
  products: 'Alaabta', sales: 'Iibka', pl: 'P&L', wanaagsan: 'Wanaagsan',
  rentalsReport: 'Kiro', tabAll: 'Dhammaan',
};

const EN = {
  dashboard: 'Dashboard', inventory: 'Inventory', customers: 'Customers', rentals: 'Rentals & Returns',
  invoices: 'Invoices', payments: 'Payments', finance: 'Expenses & Damage', admin: 'Users & Settings',
  logout: 'Log out', search: 'Search...', save: 'Save', cancel: 'Cancel', edit: 'Edit',
  login: 'Log in', email: 'Email', password: 'Password', name: 'Name', phone: 'Phone',
  total: 'Total', balance: 'Balance', paid: 'Paid', status: 'Status', actions: 'Actions',
  qty: 'Qty', rate: 'Daily rate', start: 'Start', end: 'Expected return', date: 'Date',
  amount: 'Amount', method: 'Payment method', reference: 'Reference', notes: 'Notes', product: 'Product',
  productsCol: 'Products', customer: 'Customer', project: 'Project', deposit: 'Deposit', return: 'Return',
  returnDate: 'Return date', recordPayment: 'Record payment', newRental: 'New rental',
  newSale: 'New sale', addProduct: 'Add product', addCustomer: 'Add customer', addUser: 'Add user',
  restock: 'Add stock', available: 'Available', rented: 'Rented', sold: 'Sold',
  damaged: 'Damaged', lost: 'Lost', inventory_total: 'Total inventory', monthRent: 'Rental revenue (this month)',
  salesRevenue: 'Sales revenue', outstanding: 'Outstanding balances', expenses: 'Expenses', profit: 'Estimated profit',
  upcoming: 'Returns due (7 days)', overdue: 'Overdue', lowStock: 'Low stock', active: 'Active',
  activeRentals: 'Active rentals', partial: 'Partially returned', completed: 'Completed', open: 'Open',
  expenseTab: 'Expenses', damageTab: 'Damage / Loss', reportsTab: 'Reports', exportCsv: 'Export CSV',
  addExpense: 'Add expense', recordDamage: 'Record damage', resolve: 'Resolve', reopen: 'Reopen',
  users: 'Users', settings: 'Settings', companyName: 'Company name', company: 'Company',
  address: 'Address', currency: 'Currency', graceDays: 'Grace days', role: 'Role', active_status: 'Active',
  saved: 'Saved', noData: 'No data', allFilter: 'All', unpaid: 'Unpaid',
  responsibility: 'Responsibility', cost: 'Cost', reason: 'Reason', type: 'Type', none: 'None',
  identificationNo: 'ID number', sku: 'SKU', size: 'Size', unit: 'Unit', warehouse: 'Warehouse',
  dailyRate: 'Daily rate', sellPrice: 'Selling price', purchaseCost: 'Purchase cost',
  openingQty: 'Opening quantity', category: 'Category', docNo: 'No.', invoiceNo: 'Invoice', openQty: 'Still out',
  price: 'Price', discount: 'Discount', taxPct: 'Tax %', selectDoc: 'Select document', rentalsTab: 'Rentals',
  goodUnits: 'Good', damagedUnits: 'Damaged', remaining: 'Remaining', lineDays: 'Days',
  totalPreview: 'Estimated total', collected: 'Cash collected', rentalRev: 'Rental revenue', net: 'Net profit',
  cash: 'Cash', bank: 'Bank transfer', mobile: 'Mobile money',
  transport: 'Transport', repair: 'Repair', salary: 'Salary', warehouseRent: 'Warehouse rent', other: 'Other',
  products: 'Products', sales: 'Sales', pl: 'P&L', wanaagsan: 'Good',
  rentalsReport: 'Rentals', tabAll: 'All',
};

const DICT = { so: SO, en: EN };
const Ctx = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem('kaah_lang') || 'so');
  const toggle = () => {
    const next = lang === 'so' ? 'en' : 'so';
    localStorage.setItem('kaah_lang', next);
    setLang(next);
  };
  const t = (key) => DICT[lang][key] ?? EN[key] ?? key;
  return <Ctx.Provider value={{ lang, toggle, t }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
