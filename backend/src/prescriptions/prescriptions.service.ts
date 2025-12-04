import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../pharmacy/stock.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { AddPrescriptionItemDto } from './dto/add-item.dto';

@Injectable()
export class PrescriptionsService {
  constructor(
    private prisma: PrismaService,
    private stockService: StockService,
  ) { }

  /**
   * ⭐ Auto-calculate quantity from dosage, frequency, and duration
   * Examples:
   * - "1 tablet" + "3 times daily" + "5 days" = 15 tablets
   * - "2 tablets" + "Twice a day" + "7 days" = 28 tablets
   * - "5ml" + "Once daily" + "10 days" = 50ml
   */
  private calculateQuantity(
    dosage: string,
    frequency: string,
    duration: string,
  ): number {
    // Extract numeric values
    const dosageMatch = dosage.match(/(\d+)/);
    const frequencyMatch = frequency.match(/(\d+)/);
    const durationMatch = duration.match(/(\d+)/);

    if (!dosageMatch || !durationMatch) {
      throw new BadRequestException(
        'Unable to calculate quantity. Ensure dosage and duration contain numbers.',
      );
    }

    const dosageAmount = parseInt(dosageMatch[1]);
    const durationDays = parseInt(durationMatch[1]);

    // Parse frequency
    let timesPerDay = 1;
    if (frequencyMatch) {
      timesPerDay = parseInt(frequencyMatch[1]);
    } else if (frequency.toLowerCase().includes('twice')) {
      timesPerDay = 2;
    } else if (frequency.toLowerCase().includes('thrice') || frequency.toLowerCase().includes('three')) {
      timesPerDay = 3;
    } else if (frequency.toLowerCase().includes('four')) {
      timesPerDay = 4;
    }

    // Calculate total quantity
    const totalQuantity = dosageAmount * timesPerDay * durationDays;

    return totalQuantity;
  }

  /**
   * Create prescription with items
   */
  async createPrescription(
    createDto: CreatePrescriptionDto,
    doctorId: string,
  ) {
    const { patientId, diagnosis, notes, items } = createDto;

    // Verify patient exists
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Calculate quantities for all items
    // 2️⃣ Build Prisma items (safe)
    const itemsWithQuantity = items.map((item) => {
      const durationStr = item.duration;            // string for calculation ("5 days" or "5")
      const durationNum = parseInt(item.duration);  // number for Prisma (5)

      const quantity = this.calculateQuantity(
        item.dosage,
        item.frequency,
        durationStr,  // calculateQuantity expects string
      );

      return {
        dosage: item.dosage,
        frequency: item.frequency,
        duration: durationNum,  // Prisma expects Int
        quantity,
        instructions: item.instructions,
        medicine: {
          connect: { id: item.medicineId },
        },
      };
    });


    // Check stock availability for all items
    const stockChecks = await Promise.all(
      items.map((item) =>
        this.stockService.hasSufficientStock(item.medicineId, item.quantity),
      ),
    );

    const insufficientItems = items
      .map((item, index) => ({
        item,
        quantity: itemsWithQuantity[index].quantity,
        stockCheck: stockChecks[index],
      }))
      .filter((x) => !x.stockCheck.sufficient);

    if (insufficientItems.length > 0) {
      // Get medicine names for error message
      const medicineDetails = await Promise.all(
        insufficientItems.map((x) =>
          this.prisma.medicine.findUnique({
            where: { id: x.item.medicineId },
          }),
        ),
      );

      const errorMessage = insufficientItems
        .map(
          (x, index) =>
            `${medicineDetails[index]?.name}: Required ${x.item.quantity}, Available ${x.stockCheck.available}`,
        )
        .join('; ');

      throw new BadRequestException(
        `Insufficient stock for: ${errorMessage}`,
      );
    }

    // Create prescription with items in transaction
    const prescription = await this.prisma.prescription.create({
      data: {
        patientId,
        doctorId,
        diagnosis,
        notes,
        items: {
          create: itemsWithQuantity,
        },
      },
      include: {
        items: {
          include: {
            medicine: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
          },
        },
        patient: {
          select: {
            id: true,
            name: true,
            token: true,
          },
        },
      },
    });

    console.log(`✅ Prescription created for patient ${patient.name} by doctor ${doctorId}`);

    return prescription;
  }

  /**
   * Add item to existing prescription
   */
  async addPrescriptionItem(
    prescriptionId: string,
    addItemDto: AddPrescriptionItemDto,
  ) {
    // Verify prescription exists
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    // Calculate quantity
    const quantity = this.calculateQuantity(
      addItemDto.dosage,
      addItemDto.frequency,
      addItemDto.duration,
    );

    // Check stock
    const stockCheck = await this.stockService.hasSufficientStock(
      addItemDto.medicineId,
      quantity,
    );

    if (!stockCheck.sufficient) {
      const medicine = await this.prisma.medicine.findUnique({
        where: { id: addItemDto.medicineId },
      });
      throw new BadRequestException(
        `Insufficient stock for ${medicine?.name}. Required: ${quantity}, Available: ${stockCheck.available}`,
      );
    }

    // Add item
    const item = await this.prisma.prescriptionItem.create({
      data: {
        prescriptionId,
        medicineId: addItemDto.medicineId,
        dosage: addItemDto.dosage,
        frequency: addItemDto.frequency,
        duration: Number(addItemDto.duration),
        quantity,
        instructions: addItemDto.instructions,
      },
      include: {
        medicine: true,
      },
    });

    return item;
  }

  /**
   * Remove item from prescription
   */
  async removePrescriptionItem(itemId: string) {
    const item = await this.prisma.prescriptionItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException('Prescription item not found');
    }

    await this.prisma.prescriptionItem.delete({
      where: { id: itemId },
    });

    return { success: true, message: 'Item removed from prescription' };
  }

  /**
   * Get prescription by ID
   */
  async getPrescriptionById(prescriptionId: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        items: {
          include: {
            medicine: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
          },
        },
        patient: {
          select: {
            id: true,
            name: true,
            token: true,
          },
        },
      },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    return prescription;
  }

  /**
   * Get all prescriptions for a patient
   */
  async getPatientPrescriptions(patientId: string) {
    const prescriptions = await this.prisma.prescription.findMany({
      where: { patientId },
      include: {
        items: {
          include: {
            medicine: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return prescriptions;
  }

  /**
   * Get all prescriptions created by a doctor
   */
  async getDoctorPrescriptions(doctorId: string) {
    const prescriptions = await this.prisma.prescription.findMany({
      where: { doctorId },
      include: {
        items: {
          include: {
            medicine: true,
          },
        },
        patient: {
          select: {
            id: true,
            name: true,
            token: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return prescriptions;
  }

  /**
   * ⭐ Repeat previous prescription (one-click feature)
   */
  async repeatPrescription(originalPrescriptionId: string, doctorId: string) {
    // Get original prescription
    const original = await this.prisma.prescription.findUnique({
      where: { id: originalPrescriptionId },
      include: {
        items: true,
      },
    });

    if (!original) {
      throw new NotFoundException('Original prescription not found');
    }

    // Create new prescription with same items
    const items = original.items.map((item) => ({
      medicineId: item.medicineId,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      quantity: item.quantity,
      instructions: item.instructions,
    }));

    // Check stock for all items
    const stockChecks = await Promise.all(
      items.map((item) =>
        this.stockService.hasSufficientStock(item.medicineId, item.quantity),
      ),
    );

    const insufficientItems = items
      .map((item, index) => ({
        item,
        stockCheck: stockChecks[index],
      }))
      .filter((x) => !x.stockCheck.sufficient);

    if (insufficientItems.length > 0) {
      const medicineDetails = await Promise.all(
        insufficientItems.map((x) =>
          this.prisma.medicine.findUnique({
            where: { id: x.item.medicineId },
          }),
        ),
      );

      const errorMessage = insufficientItems
        .map(
          (x, index) =>
            `${medicineDetails[index]?.name}: Required ${x.item.quantity}, Available ${x.stockCheck.available}`,
        )
        .join('; ');

      throw new BadRequestException(
        `Insufficient stock for: ${errorMessage}`,
      );
    }

    // Create new prescription
    const newPrescription = await this.prisma.prescription.create({
      data: {
        patientId: original.patientId,
        doctorId,
        diagnosis: original.diagnosis,
        notes: `Repeated from prescription ${original.id}`,
        items: {
          create: items,
        },
      },
      include: {
        items: {
          include: {
            medicine: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
          },
        },
        patient: {
          select: {
            id: true,
            name: true,
            token: true,
          },
        },
      },
    });

    console.log(`✅ Prescription repeated from ${originalPrescriptionId}`);

    return newPrescription;
  }
}
