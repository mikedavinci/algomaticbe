import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryColumn('text')  // Changed from 'uuid' to 'text' to accept Clerk IDs
  id: string; // This will be the Clerk user ID

  @Column()
  email: string;

  @Column({ nullable: true })
  stripe_customer_id: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ nullable: true })
  clerk_image_url: string;

  @Column({ default: false })
  email_verified: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}