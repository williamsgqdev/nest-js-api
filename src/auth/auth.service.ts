import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { AuthDto } from "./dto";
import * as argon from "argon2";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService, private jwt: JwtService, private config: ConfigService) {

    }
    async signup(dto: AuthDto) {
        //generate hash password

        const hash = await argon.hash(dto.password)

        //save user

        try {
            const user = await this.prisma.user.create({
                data: {
                    email: dto.email,
                    password: hash
                },
            })


            return this.signToken(user.id, user.email);
        } catch (error) {

            if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ForbiddenException('Credentials Exist')

            }
            throw error
        }



    }

    async signin(dto: AuthDto) {
        //find user
        const user = await this.prisma.user.findUnique({
            where: {
                email: dto.email
            }
        })
        if (!user) throw new ForbiddenException('Credentials Incorrect')
        //compare password
        const pwMatch = await argon.verify(user.password, dto.password);
        if (!pwMatch) throw new ForbiddenException('Credentials Incorrect')


        return this.signToken(user.id, user.email);
    }

    async signToken(userId: number, email: string): Promise<{ access_token: string }>{
        const payload = {
            sub: userId,
            email
        }
        const secret =  this.config.get('JWT_SECRET');
        const token = await this.jwt.signAsync(payload, {
            expiresIn: '15m',
            secret: secret,
        })

        return {
            access_token: token
        }
    }
} 