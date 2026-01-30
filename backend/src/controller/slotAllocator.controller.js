import { allocateWeeklySlots } from "../modules/slotAllocator/slotAllocator.service.js";

export async function runSlotAllocator(req, res) {
  try {
    const result = await allocateWeeklySlots();
    console.log('controller is called and runned',result);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
