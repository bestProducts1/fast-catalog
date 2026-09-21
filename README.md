# fast-catalog

Customer-facing product list for bestProducts1. It reads the same published IL/TX
warehouse sheet as the other sites, shows products with stock of at least 19,
and does not display prices. The list is stored separately from the seller
sites' shared cart.

The menu's collapsible brand filter is generated from the currently available
products in that same sheet. Customers can search all listed brands without
adding another spreadsheet or filling the page with brand buttons.

Copy List produces plain text such as:

```text
Order Request List
------------------
IL Warehouse | 2 items
IL-B008*2
TX Warehouse | 1 item
TX-A010*1
------------------
Total Items: 3
```

Paste this text into the SKU site's search box to import the products. The
published source sheet itself still contains prices; hiding them in this UI is
not a security boundary.
