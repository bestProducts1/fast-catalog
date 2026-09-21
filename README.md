# fast-catalog

Customer-facing product list for bestProducts1. It reads the same published IL/TX
warehouse sheet as the other sites, shows products with stock of at least 19,
and does not display prices. The list is stored separately from the seller
sites' shared cart.

The homepage follows the main catalog's warehouse-first brand navigation:
customers expand IL or TX, then choose any brand in that warehouse. The
brands are generated from currently available products in the same sheet.
The selection-list page follows the main catalog's card and summary layout,
but keeps prices hidden and uses Copy List instead of WhatsApp checkout.

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
