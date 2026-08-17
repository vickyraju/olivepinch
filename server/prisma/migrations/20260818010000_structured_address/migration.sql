-- Replaces the single free-text Customer.address with structured fields (door number,
-- building name, street, area, postcode) so the dashboard can edit them individually and
-- validate the postcode against active delivery zones on save. The old joined string can't
-- be reliably split back into parts, so existing addresses are not backfilled — customers
-- with one on file will need to re-enter it once.
ALTER TABLE "Customer" ADD COLUMN "addressDoorNumber" TEXT;
ALTER TABLE "Customer" ADD COLUMN "addressBuildingName" TEXT;
ALTER TABLE "Customer" ADD COLUMN "addressStreet" TEXT;
ALTER TABLE "Customer" ADD COLUMN "addressArea" TEXT;
ALTER TABLE "Customer" ADD COLUMN "addressPostcode" TEXT;

ALTER TABLE "Customer" DROP COLUMN "address";
