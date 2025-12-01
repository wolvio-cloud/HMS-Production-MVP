import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, DoctorSpecialty } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get all users (admin only)
   * GET /api/users?role=DOCTOR
   */
  @Get()
  @Roles(UserRole.ADMIN)
  async getAllUsers(@Query('role') role?: UserRole) {
    return this.usersService.getAllUsers(role);
  }

  /**
   * Get user by ID
   * GET /api/users/:id
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  async getUser(@Param('id') userId: string) {
    return this.usersService.getUserById(userId);
  }

  /**
   * Get current user profile
   * GET /api/users/me/profile
   */
  @Get('me/profile')
  async getMyProfile(@CurrentUser() user: any) {
    return this.usersService.getUserProfile(user.id);
  }

  /**
   * ⭐ Get all doctors (for doctor selection)
   * GET /api/users/doctors/all?specialty=ORTHOPEDIC
   */
  @Get('doctors/all')
  async getAllDoctors(@Query('specialty') specialty?: DoctorSpecialty) {
    return this.usersService.getAllDoctors(specialty);
  }

  /**
   * Get general doctors (shared queue)
   * GET /api/users/doctors/general
   */
  @Get('doctors/general')
  async getGeneralDoctors() {
    return this.usersService.getGeneralDoctors();
  }

  /**
   * Get specialist doctors by specialty
   * GET /api/users/doctors/specialists/:specialty
   */
  @Get('doctors/specialists/:specialty')
  async getSpecialistDoctors(@Param('specialty') specialty: DoctorSpecialty) {
    return this.usersService.getSpecialistDoctors(specialty);
  }

  /**
   * Get doctor statistics
   * GET /api/users/doctors/:id/stats
   */
  @Get('doctors/:id/stats')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  async getDoctorStats(@Param('id') doctorId: string) {
    return this.usersService.getDoctorStats(doctorId);
  }

  /**
   * Get staff by role
   * GET /api/users/staff/:role
   */
  @Get('staff/:role')
  @Roles(UserRole.ADMIN)
  async getStaffByRole(@Param('role') role: UserRole) {
    return this.usersService.getStaffByRole(role);
  }

  /**
   * Deactivate user
   * PATCH /api/users/:id/deactivate
   */
  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN)
  async deactivateUser(@Param('id') userId: string) {
    return this.usersService.deactivateUser(userId);
  }

  /**
   * Activate user
   * PATCH /api/users/:id/activate
   */
  @Patch(':id/activate')
  @Roles(UserRole.ADMIN)
  async activateUser(@Param('id') userId: string) {
    return this.usersService.activateUser(userId);
  }
}
